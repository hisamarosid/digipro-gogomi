import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { hashToken, validatePasswordStrength } from '@/lib/auth/validation';
import { hashPassword } from '@/lib/auth/password';
import { NotificationOrchestrator } from '@/services/email/email-orchestrator';
import { AuditService } from '@/services/audit.service';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { CustomerNotificationCategory } from '../../../../../generated/prisma';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    
    // IP rate limit
    const ipCheck = checkRateLimit(`reset_pwd_ip_${ip}`, 10, 60000);
    if (!ipCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak percobaan reset password. Coba lagi dalam 1 menit.' },
        { status: 429 }
      );
    }

    const { token, password, confirmPassword } = await req.json().catch(() => ({}));

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Token reset password tidak valid atau tidak disertakan.' },
        { status: 400 }
      );
    }

    if (!password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Password baru dan konfirmasi password wajib diisi.' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Konfirmasi password tidak cocok dengan password baru.' },
        { status: 400 }
      );
    }

    // Validate password strength according to 5 rules
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: `Password belum memenuhi syarat: ${passwordValidation.errors.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token.trim());

    const resetRecord = await db.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { success: false, error: 'Link reset password tidak valid atau tidak ditemukan.' },
        { status: 400 }
      );
    }

    if (resetRecord.used) {
      return NextResponse.json(
        {
          success: false,
          error: 'Link reset password ini sudah pernah digunakan. Silakan ajukan reset password baru.',
        },
        { status: 400 }
      );
    }

    if (new Date() > resetRecord.expires) {
      return NextResponse.json(
        {
          success: false,
          error: 'Link reset password sudah kedaluwarsa. Silakan ajukan reset password baru.',
        },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: resetRecord.email },
    });

    if (!user || user.disabled) {
      return NextResponse.json(
        { success: false, error: 'Pengguna tidak ditemukan atau dinonaktifkan.' },
        { status: 404 }
      );
    }

    const newPasswordHash = await hashPassword(password);

    // Update password, mark token used, and invalidate active sessions in DB
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      }),
      db.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
      db.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    // Send security confirmation email
    try {
      await NotificationOrchestrator.dispatchEvent({
        userId: user.id,
        userEmail: user.email,
        eventType: 'PASSWORD_RESET_COMPLETED',
        title: 'Password Akun Anda Berhasil Diubah',
        message: 'Password akun Gogomi Store Anda telah berhasil diperbarui.',
        actionUrl: '/login',
        emailTemplateKey: 'PASSWORD_CHANGED',
        emailCategory: 'TRANSACTIONAL',
        metadata: {
          customerName: user.name,
          category: CustomerNotificationCategory.SECURITY,
        },
        dedupeKey: `PWD_CHANGED:${user.id}:${Date.now()}`,
      });

      await AuditService.log({
        actorId: user.id,
        action: 'PASSWORD_RESET_COMPLETED',
        entity: 'USER',
        entityId: user.id,
        ip: ip || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      });
    } catch (err: any) {
      console.error('[ResetPassword] Security Email Dispatch Error:', err?.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Password akun Anda berhasil diperbarui. Silakan masuk kembali dengan password baru Anda.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui password akun' },
      { status: 500 }
    );
  }
}
