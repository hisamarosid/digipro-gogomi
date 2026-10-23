import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { hashToken } from '@/lib/auth/validation';
import { getCurrentSession, setSessionCookie } from '@/lib/auth/session';
import { AuditService } from '@/services/audit.service';
import { OrderService } from '@/services/order.service';
import { checkRateLimit } from '@/lib/security/rate-limit';

async function handleVerification(token: string | null, req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
  const rateCheck = checkRateLimit(`verify_${ip}`, 15, 60000);
  if (!rateCheck.success) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.' },
      { status: 429 }
    );
  }

  if (!token || typeof token !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Token verifikasi tidak valid atau tidak disertakan.' },
      { status: 400 }
    );
  }

  const tokenHash = hashToken(token.trim());

  const verificationRecord = await db.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!verificationRecord) {
    return NextResponse.json(
      { success: false, error: 'Link verifikasi tidak valid atau tidak ditemukan.' },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({
    where: { email: verificationRecord.email },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Pengguna tidak ditemukan.' },
      { status: 404 }
    );
  }

  if (user.emailVerified) {
    // Mark token as used if not already
    if (!verificationRecord.used) {
      await db.emailVerificationToken.update({
        where: { id: verificationRecord.id },
        data: { used: true },
      });
    }
    return NextResponse.json({
      success: true,
      alreadyVerified: true,
      message: 'Email Anda sudah terverifikasi.',
    });
  }

  if (verificationRecord.used) {
    return NextResponse.json(
      {
        success: false,
        error: 'Link verifikasi ini sudah pernah digunakan. Silakan minta link baru.',
      },
      { status: 400 }
    );
  }

  if (new Date() > verificationRecord.expires) {
    return NextResponse.json(
      {
        success: false,
        isExpired: true,
        error: 'Link verifikasi sudah kedaluwarsa. Silakan kirim ulang email verifikasi.',
      },
      { status: 400 }
    );
  }

  const verifiedAt = new Date();

  // Mark user verified and token as used
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { emailVerified: verifiedAt },
    }),
    db.emailVerificationToken.update({
      where: { id: verificationRecord.id },
      data: { used: true },
    }),
  ]);

  // Now that the inbox is proven, attach purchases made as a guest with this email
  await OrderService.claimGuestOrdersForUser(user.id, user.email);

  // Update session cookie if the logged-in user matches
  const currentSession = await getCurrentSession();
  if (currentSession && currentSession.userId === user.id) {
    await setSessionCookie({
      ...currentSession,
      emailVerified: true,
    });
  }

  await AuditService.log({
    actorId: user.id,
    action: 'EMAIL_VERIFIED',
    entity: 'USER',
    entityId: user.id,
    after: { emailVerified: verifiedAt },
    ip: ip || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  return NextResponse.json({
    success: true,
    message: 'Email Anda berhasil diverifikasi!',
  });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  return handleVerification(token, req);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token || req.nextUrl.searchParams.get('token');
    return handleVerification(token, req);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Gagal memproses verifikasi' },
      { status: 500 }
    );
  }
}
