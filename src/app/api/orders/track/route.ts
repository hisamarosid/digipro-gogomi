import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { NotificationOrchestrator } from '@/services/email/email-orchestrator';
import { buildOrderAccessPath } from '@/lib/utils/order-link';

const NOT_FOUND = {
  success: false,
  error: 'Pesanan tidak ditemukan atau email tidak cocok. Periksa kembali nomor pesanan dan email saat checkout.',
};

/**
 * Guest order lookup: order number + the email used at checkout.
 * Shows the status and emails the private order link to that same address.
 * Credentials are never returned here.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    if (!checkRateLimit(`track_ip_${ip}`, 6, 60_000).success) {
      return NextResponse.json({ success: false, error: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const orderNumber = String(body.orderNumber || '').trim().toUpperCase();
    const email = String(body.email || '').trim().toLowerCase();

    if (!orderNumber || !email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Nomor pesanan dan email wajib diisi.' }, { status: 400 });
    }

    // Also cap tries per order number so one order cannot be probed from many IPs.
    if (!checkRateLimit(`track_order_${orderNumber}`, 10, 10 * 60_000).success) {
      return NextResponse.json({ success: false, error: 'Terlalu banyak percobaan untuk pesanan ini. Coba lagi nanti.' }, { status: 429 });
    }

    const order = await db.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        userId: true,
        guestEmail: true,
        guestName: true,
        guestToken: true,
        user: { select: { email: true } },
        items: { select: { productName: true, variantName: true, quantity: true } },
      },
    });

    const ownerEmail = (order?.user?.email || order?.guestEmail || '').toLowerCase().trim();
    if (!order || !ownerEmail || ownerEmail !== email) {
      return NextResponse.json(NOT_FOUND, { status: 404 });
    }

    const summary = {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt.toISOString(),
      items: order.items,
    };

    // Orders that belong to an account are opened by logging in.
    if (order.userId) {
      return NextResponse.json({ success: true, data: { ...summary, access: 'LOGIN' } });
    }

    if (order.paymentStatus !== 'PAID') {
      const payPath = order.status === 'PENDING_PAYMENT' ? `/payment/${order.orderNumber}` : null;
      return NextResponse.json({ success: true, data: { ...summary, access: 'NONE', payPath } });
    }

    const bucket = Math.floor(Date.now() / (10 * 60_000)); // one email per order per 10 minutes
    await NotificationOrchestrator.dispatchEvent({
      userId: null,
      userEmail: order.guestEmail,
      eventType: 'ORDER_ACCESS_LINK',
      title: `Link Pesanan #${order.orderNumber} — Gogomi Store`,
      message: 'Link pribadi untuk membuka pesanan Anda.',
      actionUrl: buildOrderAccessPath(order.orderNumber, order.guestToken),
      emailTemplateKey: 'ORDER_ACCESS_LINK',
      emailCategory: 'TRANSACTIONAL',
      metadata: { customerName: order.guestName || 'Pelanggan', orderNumber: order.orderNumber },
      dedupeKey: `ORDER_LINK:${order.id}:${bucket}`,
    });

    return NextResponse.json({ success: true, data: { ...summary, access: 'EMAIL_SENT' } });
  } catch (err: any) {
    console.error('[Track Order] Error:', err?.message);
    return NextResponse.json({ success: false, error: 'Gagal memeriksa pesanan.' }, { status: 500 });
  }
}
