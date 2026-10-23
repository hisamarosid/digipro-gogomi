import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { verifyInvoice } from '@/lib/security/invoice-token';
import { InvoiceOrderService } from '@/services/invoiceOrder.service';
import { InvoicePayClient } from './InvoicePayClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tagihan - Gogomi Store',
  robots: { index: false, follow: false },
};

function Notice({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center space-y-4">
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
      <Link href="/" className="inline-block rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-xs font-bold text-white">
        Kembali ke Beranda
      </Link>
    </div>
  );
}

export default async function InvoicePayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = verifyInvoice(decodeURIComponent(token));

  if (!invoice) {
    return <Notice title="Link Tagihan Tidak Valid" message="Link ini salah atau sudah kedaluwarsa. Minta link baru ke admin Gogomi Store lewat WhatsApp." />;
  }

  const existing = await InvoiceOrderService.findOrdersForLink(invoice.id);
  if (existing.some((o) => o.paymentStatus === 'PAID')) {
    return <Notice title="Tagihan Sudah Dibayar" message="Pembayaran untuk tagihan ini sudah kami terima. Admin akan menghubungi Anda untuk proses pengerjaan." />;
  }

  return (
    <InvoicePayClient
      token={decodeURIComponent(token)}
      title={invoice.title}
      amount={invoice.amount}
      qty={invoice.qty}
      note={invoice.note || ''}
      expiresAt={new Date(invoice.exp).toISOString()}
    />
  );
}
