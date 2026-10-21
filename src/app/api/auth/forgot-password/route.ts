import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { generateSecureToken, hashToken } from '@/lib/auth/validation';
import { NotificationOrchestrator } from '@/services/email/email-orchestrator';
import { AuditService } from '@/services/audit.service';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { CustomerNotificationCategory } from '../../../../../generated/prisma';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    
    // IP rate limit
    const ipCheck = checkRateLimit(`forgot_ip_${ip}`, 5, 60000);
    if (!ipCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak permintaan reset password. Coba lagi dalam beberapa menit.' },
        { status: 429 }
      );
    }

    const { email } = await req.json().catch(() => ({}));
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Alamat email wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Standard safe response to prevent email enumeration
    const safeResponse = {
      success: true,
      message: 'Jika email terdaftar, kami telah mengirimkan petunjuk reset password ke kotak masuk Anda.',
    };

    const user = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user || user.disabled) {
      return NextResponse.json(safeResponse);
    }

    // Invalidate previous unused reset tokens
    await db.passwordResetToken.updateMany({
      where: { email: cleanEmail, used: false },
      data: { used: true },
    });

    // Generate secure token (expires in 60 minutes)
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await db.passwordResetToken.create({
      data: {
        email: cleanEmail,
        tokenHash,
        expires,
      },
    });

    // Send reset password email
    try {
      await NotificationOrchestrator.dispatchEvent({
        userId: user.id,
        userEmail: user.email,
        eventType: 'PASSWORD_RESET_REQUESTED',
        title: 'Reset Password Akun Gogomi Store',
        message: 'Permintaan reset password telah dibuat. Klik tautan untuk membuat password baru.',
        actionUrl: `/reset-password?token=${rawToken}`,
        emailTemplateKey: 'PASSWORD_RESET',
        emailCategory: 'TRANSACTIONAL',
        metadata: {
          customerName: user.name,
          resetUrl: `/reset-password?token=${rawToken}`,
          category: CustomerNotificationCategory.SECURITY,
        },
        dedupeKey: `PWD_RESET:${user.id}:${Date.now()}`,
      });

      await AuditService.log({
        actorId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        entity: 'USER',
        entityId: user.id,
        after: { email: cleanEmail },
        ip: ip || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      });
    } catch (err: any) {
      console.error('[ForgotPassword] Email Dispatch Error:', err?.message);
    }

    return NextResponse.json(safeResponse);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Gagal memproses permintaan reset password' },
      { status: 500 }
    );
  }
}
