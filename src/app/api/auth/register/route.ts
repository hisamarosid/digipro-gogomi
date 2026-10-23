import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { setSessionCookie } from '@/lib/auth/session';
import {
  isAllowedEmailDomain,
  EMAIL_DOMAIN_ERROR_MESSAGE,
  validatePasswordStrength,
  generateSecureToken,
  hashToken,
} from '@/lib/auth/validation';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { NotificationOrchestrator } from '@/services/email/email-orchestrator';
import { AuditService } from '@/services/audit.service';
import { Role, CustomerNotificationCategory } from '../../../../../generated/prisma';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const rateCheck = checkRateLimit(`register_${ip}`, 5, 60000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak percobaan pendaftaran. Coba lagi dalam 1 menit.' },
        { status: 429 }
      );
    }

    const { name, email, password, referralCode, termsAccepted } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Semua kolom pendaftaran wajib diisi' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Validate allowed email domain
    if (!isAllowedEmailDomain(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: EMAIL_DOMAIN_ERROR_MESSAGE },
        { status: 400 }
      );
    }

    // 2. Validate password strength
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

    // 3. Validate terms agreement
    if (termsAccepted !== true) {
      return NextResponse.json(
        {
          success: false,
          error: 'Anda harus menyetujui Ketentuan Layanan dan Kebijakan Privasi.',
        },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email sudah terdaftar. Silakan login.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();

    // Read referral code from request payload or cookie
    const targetRefCode = referralCode?.trim() || req.cookies.get('gogomi_ref')?.value;
    let referredByUserId: string | null = null;

    if (targetRefCode) {
      const referrer = await db.user.findUnique({
        where: { referralCode: targetRefCode.trim().toUpperCase() },
        select: { id: true },
      });
      if (referrer) {
        referredByUserId = referrer.id;
      }
    }

    const newUser = await db.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: Role.CUSTOMER,
        referredByUserId,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        emailVerified: null,
      },
    });

    // Guest orders placed with this email are linked only after the email is verified
    // (see verify-email route), so an unverified signup can never see someone else's purchases.

    // Create verification token (expires in 24 hours)
    const rawVerificationToken = generateSecureToken();
    const tokenHash = hashToken(rawVerificationToken);
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.emailVerificationToken.create({
      data: {
        email: cleanEmail,
        tokenHash,
        expires: tokenExpires,
      },
    });

    await setSessionCookie({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      emailVerified: false,
    });

    // Dispatch verification email
    try {
      await NotificationOrchestrator.dispatchEvent({
        userId: newUser.id,
        userEmail: newUser.email,
        eventType: 'EMAIL_VERIFICATION_SENT',
        title: 'Verifikasi Email Akun Gogomi Store Anda',
        message: `Halo ${newUser.name}, silakan klik tautan untuk memverifikasi akun Anda.`,
        actionUrl: `/verify-email?token=${rawVerificationToken}`,
        emailTemplateKey: 'VERIFY_EMAIL',
        emailCategory: 'TRANSACTIONAL',
        metadata: {
          customerName: newUser.name,
          verificationUrl: `/verify-email?token=${rawVerificationToken}`,
          category: CustomerNotificationCategory.SECURITY,
        },
        dedupeKey: `VERIFY_INIT:${newUser.id}`,
      });

      await AuditService.log({
        actorId: newUser.id,
        action: 'EMAIL_VERIFICATION_SENT',
        entity: 'USER',
        entityId: newUser.id,
        after: { email: cleanEmail },
        ip: ip || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      });
    } catch (err: any) {
      console.error('[Register] Verification Email Dispatch Error:', err?.message);
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          emailVerified: false,
        },
      },
    });
  } catch (err: any) {
    console.error('[Register] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal mendaftar akun baru' },
      { status: 500 }
    );
  }
}
