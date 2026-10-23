import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, handleAuthError } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { AuditService } from '@/services/audit.service';
import { INVOICE_LIMITS, newInvoiceId, signInvoice } from '@/lib/security/invoice-token';

/** Admin creates a payment link for a custom-priced service. Nothing is stored until the customer opens it. */
export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(PERMISSIONS.ORDER_UPDATE);
    const body = await req.json().catch(() => ({}));

    const title = String(body.title || '').trim();
    const note = String(body.note || '').trim();
    const amount = Number(body.amount);
    const qty = Number(body.qty ?? 1);
    const days = Number(body.validDays ?? 3);

    if (!title || title.length > INVOICE_LIMITS.maxTitle) {
      return NextResponse.json({ success: false, error: `Judul jasa wajib diisi (maks ${INVOICE_LIMITS.maxTitle} karakter).` }, { status: 400 });
    }
    if (!Number.isInteger(amount) || amount < INVOICE_LIMITS.minAmount || amount > INVOICE_LIMITS.maxAmount) {
      return NextResponse.json({ success: false, error: 'Harga harus berupa angka bulat, minimal Rp1.000.' }, { status: 400 });
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > INVOICE_LIMITS.maxQty) {
      return NextResponse.json({ success: false, error: 'Jumlah harus 1 sampai 99.' }, { status: 400 });
    }
    if (!Number.isInteger(days) || days < 1 || days > INVOICE_LIMITS.maxDays) {
      return NextResponse.json({ success: false, error: 'Masa berlaku link 1 sampai 30 hari.' }, { status: 400 });
    }
    if (note.length > INVOICE_LIMITS.maxNote) {
      return NextResponse.json({ success: false, error: `Catatan maksimal ${INVOICE_LIMITS.maxNote} karakter.` }, { status: 400 });
    }

    const id = newInvoiceId();
    const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
    const token = signInvoice({ v: 1, id, title, amount, qty, note: note || undefined, exp: expiresAt });

    const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    const path = `/bayar/${token}`;

    await AuditService.log({
      actorId: session.userId,
      action: 'ADMIN_CREATE_INVOICE_LINK',
      entity: 'Invoice',
      entityId: id,
      after: { title, amount, qty, validDays: days },
    });

    return NextResponse.json({
      success: true,
      data: { id, path, url: appUrl ? `${appUrl}${path}` : path, expiresAt: new Date(expiresAt).toISOString() },
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
