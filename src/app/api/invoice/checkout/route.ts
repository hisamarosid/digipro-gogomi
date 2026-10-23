import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { verifyInvoice } from '@/lib/security/invoice-token';
import { InvoiceOrderService } from '@/services/invoiceOrder.service';
import { isAllowedEmailDomain, EMAIL_DOMAIN_ERROR_MESSAGE } from '@/lib/auth/validation';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Customer opens an admin-made payment link and confirms their contact details.
 * Creates (or resumes) the order and returns where to pay.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    if (!checkRateLimit(`invoice_${ip}`, 6, 60_000).success) {
      return NextResponse.json({ success: false, error: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const invoice = verifyInvoice(String(body.token || ''));
    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Link tagihan tidak valid atau sudah kedaluwarsa.' }, { status: 400 });
    }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    if (!name || name.length > 80) {
      return NextResponse.json({ success: false, error: 'Nama wajib diisi.' }, { status: 400 });
    }
    if (!EMAIL_SHAPE.test(email) || !isAllowedEmailDomain(email)) {
      return NextResponse.json({ success: false, error: EMAIL_DOMAIN_ERROR_MESSAGE }, { status: 400 });
    }

    const existing = await InvoiceOrderService.findOrdersForLink(invoice.id);

    if (existing.some((o) => o.paymentStatus === 'PAID')) {
      return NextResponse.json({ success: false, error: 'Tagihan ini sudah dibayar. Terima kasih!' }, { status: 409 });
    }

    // Resume an order that is still waiting for payment instead of creating a duplicate.
    const pending = existing.find((o) => o.status === 'PENDING_PAYMENT');
    if (pending) {
      if ((pending.guestEmail || '').toLowerCase() !== email) {
        return NextResponse.json(
          { success: false, error: 'Tagihan ini sedang dibayar oleh pengguna lain. Coba lagi dalam 15 menit.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ success: true, data: { orderNumber: pending.orderNumber, guestToken: pending.guestToken } });
    }

    const order = await InvoiceOrderService.createOrderFromInvoice(invoice, { name, email, phone: phone || undefined });
    return NextResponse.json({ success: true, data: { orderNumber: order.orderNumber, guestToken: order.guestToken } });
  } catch (err: any) {
    console.error('[Invoice Checkout] Error:', err?.message);
    return NextResponse.json({ success: false, error: 'Gagal memproses tagihan.' }, { status: 500 });
  }
}
