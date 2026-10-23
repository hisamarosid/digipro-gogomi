import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { setSessionCookie } from '@/lib/auth/session';
import { hashToken, validatePasswordStrength } from '@/lib/auth/validation';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { OrderService } from '@/services/order.service';
import { AuditService } from '@/services/audit.service';
import { Role } from '../../../../../../generated/prisma';

async function findUsableToken(rawToken: string | null) {
  if (!rawToken) return null;
  const record = await db.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!record || record.used || record.expires < new Date()) return null;
  return record;
}

/** Checks the activation link and returns what the form needs (email + a name to prefill). */
export async function GET(req: NextRequest) {
  const record = await findUsableToken(req.nextUrl.searchParams.get('token'));
  if (!record) {
    return NextResponse.json({ success: false, error: 'Link tidak valid atau sudah kedaluwarsa.' }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email: record.email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ success: false, hasAccount: true, error: 'Email ini sudah punya akun. Silakan masuk.' }, { status: 409 });
  }

  const lastOrder = await db.order.findFirst({
    where: { guestEmail: record.email, userId: null },
    orderBy: { createdAt: 'desc' },
    select: { guestName: true },
  });

  return NextResponse.json({ success: true, data: { email: record.email, name: lastOrder?.guestName || '' } });
}

/** Creates an already-verified account from the emailed link, links earlier guest orders, and signs in. */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    if (!checkRateLimit(`claim_done_${ip}`, 5, 60_000).success) {
      return NextResponse.json({ success: false, error: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.' }, { status: 429 });
    }

    const { token, name, password, termsAccepted } = await req.json();

    const record = await findUsableToken(token);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Link tidak valid atau sudah kedaluwarsa.' }, { status: 400 });
    }
    if (!name || !String(name).trim() || !password) {
      return NextResponse.json({ success: false, error: 'Nama dan password wajib diisi.' }, { status: 400 });
    }
    const strength = validatePasswordStrength(password);
    if (!strength.isValid) {
      return NextResponse.json({ success: false, error: `Password belum memenuhi syarat: ${strength.errors.join(', ')}` }, { status: 400 });
    }
    if (termsAccepted !== true) {
      return NextResponse.json({ success: false, error: 'Anda harus menyetujui Ketentuan Layanan dan Kebijakan Privasi.' }, { status: 400 });
    }

    const email = record.email;
    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ success: false, hasAccount: true, error: 'Email ini sudah punya akun. Silakan masuk.' }, { status: 409 });
    }

    const now = new Date();
    const user = await db.user.create({
      data: {
        name: String(name).trim(),
        email,
        passwordHash: await hashPassword(password),
        role: Role.CUSTOMER,
        emailVerified: now, // the link was delivered to this inbox, so ownership is already proven
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
      },
    });

    await db.emailVerificationToken.update({ where: { id: record.id }, data: { used: true } });
    await OrderService.claimGuestOrdersForUser(user.id, user.email);

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: true,
    });

    await AuditService.log({
      actorId: user.id,
      action: 'GUEST_ACCOUNT_CLAIMED',
      entity: 'USER',
      entityId: user.id,
      after: { email },
      ip: ip || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Claim Complete] Error:', err?.message);
    return NextResponse.json({ success: false, error: 'Gagal membuat akun.' }, { status: 500 });
  }
}
