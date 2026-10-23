import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { canAccessOrder } from '@/lib/auth/order-access';
import { generateSecureToken, hashToken, isAllowedEmailDomain, EMAIL_DOMAIN_ERROR_MESSAGE } from '@/lib/auth/validation';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { NotificationOrchestrator } from '@/services/email/email-orchestrator';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

/**
 * Starts the "save my guest order to an account" flow.
 * Only the holder of the order's private link may ask, and the activation link goes to the buyer's
 * own email, so owning the inbox is what proves the account belongs to them.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    if (!checkRateLimit(`claim_ip_${ip}`, 5, 60_000).success) {
      return NextResponse.json({ success: false, error: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const orderNumber = String(body.orderNumber || '').trim();
    const token = String(body.t || '');

    const order = orderNumber
      ? await db.order.findUnique({
          where: { orderNumber },
          select: { id: true, userId: true, guestEmail: true, guestName: true, guestToken: true },
        })
      : null;

    if (!order || order.userId || !order.guestEmail || !(await canAccessOrder(order, token))) {
      return NextResponse.json({ success: false, error: 'Permintaan tidak valid.' }, { status: 403 });
    }

    const email = order.guestEmail.toLowerCase().trim();

    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ success: true, data: { status: 'HAS_ACCOUNT', email: maskEmail(email) } });
    }

    if (!isAllowedEmailDomain(email)) {
      return NextResponse.json({ success: false, error: EMAIL_DOMAIN_ERROR_MESSAGE }, { status: 400 });
    }

    if (!checkRateLimit(`claim_order_${order.id}`, 3, 10 * 60_000).success) {
      return NextResponse.json({ success: false, error: 'Link sudah dikirim. Tunggu beberapa menit sebelum meminta lagi.' }, { status: 429 });
    }

    const rawToken = generateSecureToken();
    await db.emailVerificationToken.create({
      data: {
        email,
        tokenHash: hashToken(rawToken),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await NotificationOrchestrator.dispatchEvent({
      userId: null,
      userEmail: email,
      eventType: 'CLAIM_ACCOUNT_REQUESTED',
      title: 'Simpan Pesanan Anda ke Akun Gogomi Store',
      message: 'Link untuk mengaktifkan akun dan menyimpan pesanan Anda.',
      actionUrl: `/claim-account?token=${rawToken}`,
      emailTemplateKey: 'CLAIM_ACCOUNT',
      emailCategory: 'TRANSACTIONAL',
      metadata: { customerName: order.guestName || 'Pelanggan' },
      dedupeKey: `CLAIM:${order.id}:${rawToken}`,
    });

    return NextResponse.json({ success: true, data: { status: 'SENT', email: maskEmail(email) } });
  } catch (err: any) {
    console.error('[Claim Request] Error:', err?.message);
    return NextResponse.json({ success: false, error: 'Gagal mengirim link aktivasi.' }, { status: 500 });
  }
}
