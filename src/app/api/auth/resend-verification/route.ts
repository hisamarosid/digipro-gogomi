import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { generateSecureToken, hashToken } from '@/lib/auth/validation';
import { getCurrentSession } from '@/lib/auth/session';
import { NotificationOrchestrator } from '@/services/email/email-orchestrator';
import { AuditService } from '@/services/audit.service';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { CustomerNotificationCategory } from '../../../../../generated/prisma';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    
    // Global IP rate limit
    const ipLimit = checkRateLimit(`resend_ip_${ip}`, 10, 60000);
    if (!ipLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const session = await getCurrentSession();

    const targetEmail = (body.email || session?.email || '').toLowerCase().trim();

    if (!targetEmail) {
      return NextResponse.json(
        { success: false, error: 'Alamat email wajib disertakan.' },
        { status: 400 }
      );
    }

    // 60-second cooldown per target email
    const emailCooldown = checkRateLimit(`resend_cooldown_${targetEmail}`, 1, 60000);
    if (!emailCooldown.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Harap tunggu 60 detik sebelum meminta pengiriman ulang email verifikasi.',
          cooldownRemaining: Math.ceil((emailCooldown.resetTime - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: targetEmail },
    });

    if (!user) {
      // Safe response without revealing account existence
      return NextResponse.json({
        success: true,
        message: 'Jika email terdaftar, link verifikasi telah dikirimkan.',
      });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'Email Anda sudah terverifikasi.',
      });
    }

    // Invalidate previous unused tokens for this email
    await db.emailVerificationToken.updateMany({
      where: { email: targetEmail, used: false },
      data: { used: true },
    });

    // Create new token (expires in 24h)
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.emailVerificationToken.create({
      data: {
        email: targetEmail,
        tokenHash,
        expires,
      },
    });

    // Dispatch verification email
    try {
      await NotificationOrchestrator.dispatchEvent({
        userId: user.id,
        userEmail: user.email,
        eventType: 'EMAIL_VERIFICATION_SENT',
        title: 'Verifikasi Email Akun Gogomi Store Anda',
        message: `Halo ${user.name}, silakan klik tautan untuk memverifikasi akun Anda.`,
        actionUrl: `/verify-email?token=${rawToken}`,
        emailTemplateKey: 'VERIFY_EMAIL',
        emailCategory: 'TRANSACTIONAL',
        metadata: {
          customerName: user.name,
          verificationUrl: `/verify-email?token=${rawToken}`,
          category: CustomerNotificationCategory.SECURITY,
        },
        dedupeKey: `RESEND_VERIFY:${user.id}:${Date.now()}`,
      });

      await AuditService.log({
        actorId: user.id,
        action: 'EMAIL_VERIFICATION_SENT',
        entity: 'USER',
        entityId: user.id,
        after: { email: targetEmail },
        ip: ip || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      });
    } catch (err: any) {
      console.error('[ResendVerification] Email Dispatch Error:', err?.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Link verifikasi email baru berhasil dikirim. Silakan periksa kotak masuk Anda.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Gagal mengirim ulang email verifikasi' },
      { status: 500 }
    );
  }
}
