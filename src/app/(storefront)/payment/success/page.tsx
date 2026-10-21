import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db/prisma';
import { CheckCircle2, ArrowRight, ShieldCheck, Key, Copy, UserPlus, ShoppingBag, FileText } from 'lucide-react';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import { CheckoutProgress } from '@/components/storefront/CheckoutProgress';
import { FirstTimeGuideOrchestrator } from '@/components/account/FirstTimeGuideOrchestrator';

import { formatRevealedPayload } from '@/lib/security/encryption';

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  const { orderNumber } = await searchParams;

  if (!orderNumber) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Pesanan Tidak Ditemukan</h2>
        <Link href="/" className="text-xs font-bold text-emerald-400">Kembali ke Beranda</Link>
      </div>
    );
  }

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: {
      items: {
        include: {
          fulfillments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Order {orderNumber} Tidak Ditemukan</h2>
        <Link href="/" className="text-xs font-bold text-emerald-400">Kembali ke Beranda</Link>
      </div>
    );
  }

  const isGuestOrder = !order.userId;

  return (
    <div className="mx-auto max-w-xl px-4 py-6 space-y-6">
      
      <CheckoutProgress currentStep={3} />

      {/* Success Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-bounce">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wide">✓ PEMBAYARAN BERHASIL</h1>
        <p className="text-xs text-slate-400">
          Pembayaran untuk pesanan <span className="font-mono text-emerald-400 font-bold">{order.orderNumber}</span> telah berhasil dikonfirmasi!
        </p>
      </div>

      {/* Order Summary Card */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-3">
          <span className="text-slate-400">Waktu Transaksi</span>
          <span className="text-white font-medium">{formatDateJakarta(order.createdAt)}</span>
        </div>

        <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-3">
          <span className="text-slate-400">Total Pembayaran</span>
          <span className="text-base font-extrabold text-emerald-400">{formatIDR(order.grandTotal)}</span>
        </div>

        {order.guestEmail && (
          <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-3">
            <span className="text-slate-400">Email Pengiriman</span>
            <span className="text-white font-mono">{order.guestEmail}</span>
          </div>
        )}

        {/* Revealed Products & Credentials */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Hasil Pengiriman Digital:</h3>
          {order.items.map((item) => {
            const activeFulfillment = item.fulfillments[0];
            const displayPayload = activeFulfillment?.payloadRevealed ? formatRevealedPayload(activeFulfillment.payloadRevealed) : '';
            return (
              <div key={item.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-start text-xs">
                  <div>
                    <p className="font-bold text-white">{item.productName}</p>
                    <p className="text-[10px] text-emerald-400">{item.variantName}</p>
                  </div>
                  <span className="rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5">
                    {activeFulfillment?.status || 'FULFILLED'}
                  </span>
                </div>

                {/* Revealed Credential Payload */}
                {displayPayload ? (
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 break-all select-all flex items-center justify-between">
                    <span>{displayPayload}</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Kredensial atau lisensi sedang diproses oleh sistem dan dikirimkan ke email Anda.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Guest Registration CTA Banner if order made by guest */}
        {isGuestOrder && (
          <div className="rounded-2xl bg-gradient-to-br from-cyan-950/60 to-blue-950/60 border border-cyan-500/30 p-4 space-y-3 mt-4">
            <div className="flex items-start gap-2.5">
              <UserPlus className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-white">Simpan Pesanan ke Akun Member</h4>
                <p className="text-[11px] text-cyan-200/80 leading-relaxed">
                  Buat akun dengan email <strong className="text-white font-mono">{order.guestEmail}</strong> agar pesanan ini otomatis tersimpan di dashboard Anda, mempermudah klaim garansi, dan mengaktifkan bonus Store Coins!
                </p>
              </div>
            </div>
            <Link
              href={`/register?email=${encodeURIComponent(order.guestEmail || '')}&redirect=/account/orders`}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 py-2.5 text-xs font-bold text-slate-950 transition shadow-md shadow-cyan-500/20"
            >
              <UserPlus className="h-4 w-4" />
              <span>Daftar Akun &amp; Simpan Pesanan</span>
            </Link>
          </div>
        )}

        {/* Invoice Link Action */}
        <div className="pt-2">
          <Link
            href={`/invoice/${order.orderNumber}`}
            target="_blank"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-950 hover:bg-slate-900 border border-slate-700/80 py-3 text-xs font-bold text-slate-200 hover:text-white transition shadow-sm"
          >
            <FileText className="h-4 w-4 text-blue-400" />
            <span>Lihat & Unduh Faktur / Invoice PDF</span>
          </Link>
        </div>

        {/* Action CTAs */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          {!isGuestOrder ? (
            <>
              <Link
                href="/account/products"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3 text-xs font-bold text-slate-950 transition"
              >
                <Key className="h-4 w-4" />
                <span>LIHAT PRODUK SAYA</span>
              </Link>
              <Link
                href="/account/orders"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-3 text-xs font-bold text-white transition"
              >
                <span>LIHAT SEMUA PESANAN</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <Link
              href="/products"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-3 text-xs font-bold text-white transition border border-slate-700"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Belanja Produk Lainnya</span>
            </Link>
          )}
        </div>

        {/* First-time Guide Popup Trigger */}
        {!isGuestOrder && <FirstTimeGuideOrchestrator orderNumber={order.orderNumber} />}

      </div>

    </div>
  );
}
