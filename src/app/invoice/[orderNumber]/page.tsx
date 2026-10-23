import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/prisma';
import { canAccessOrder } from '@/lib/auth/order-access';
import { InvoiceViewClient } from './InvoiceViewClient';

interface InvoicePageProps {
  params: Promise<{
    orderNumber: string;
  }>;
  searchParams: Promise<{ t?: string }>;
}

export async function generateMetadata({ params }: InvoicePageProps): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Invoice ${orderNumber} - Gogomi Store`,
    description: `Faktur Pembayaran Resmi untuk Pesanan ${orderNumber} di Gogomi Store`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function InvoicePage({ params, searchParams }: InvoicePageProps) {
  const { orderNumber } = await params;
  const { t: accessToken } = await searchParams;

  if (!orderNumber) {
    notFound();
  }

  let order: any = null;

  try {
    order = await db.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        coupon: {
          select: {
            code: true,
            type: true,
            value: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('[InvoicePage] Error fetching order:', error);
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center font-bold text-xl">
            !
          </div>
          <h1 className="text-lg font-bold text-white">Invoice Tidak Ditemukan</h1>
          <p className="text-xs text-slate-400">
            Nomor pesanan <span className="font-mono text-cyan-400 font-bold">{orderNumber}</span> tidak ditemukan atau belum terdaftar dalam sistem.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Invoices contain buyer details: owner, staff or the private link only (never the bare order number).
  if (!(await canAccessOrder(order, accessToken))) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
          <h1 className="text-lg font-bold text-white">Link Invoice Tidak Valid</h1>
          <p className="text-xs text-slate-400">
            Buka invoice dari link pribadi di email pesanan, atau masuk ke akun Anda. Kehilangan link? Gunakan Lacak Pesanan.
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <Link href={`/track?orderNumber=${encodeURIComponent(orderNumber)}`} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition">Lacak Pesanan</Link>
            <Link href="/login" className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition">Masuk</Link>
          </div>
        </div>
      </div>
    );
  }

  // Sanitize and serialize data safely for Client Component
  const { guestToken: _guestToken, ...orderWithoutToken } = order;
  const serializedOrder = {
    ...orderWithoutToken,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
    payments: order.payments?.map((p: any) => ({
      ...p,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
    })) || [],
  };

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://gogomi.store';

  return <InvoiceViewClient order={serializedOrder} siteUrl={siteUrl} />;
}
