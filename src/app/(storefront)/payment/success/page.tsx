import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db/prisma';
import { CheckCircle2, ArrowRight, ShieldCheck, Key, Copy, ShoppingBag, FileText } from 'lucide-react';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import { CheckoutProgress } from '@/components/storefront/CheckoutProgress';
import { FirstTimeGuideOrchestrator } from '@/components/account/FirstTimeGuideOrchestrator';

import { formatRevealedPayload } from '@/lib/security/encryption';
import { canAccessOrder } from '@/lib/auth/order-access';
import { ClaimAccountCard } from '@/components/storefront/ClaimAccountCard';

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string; t?: string }>;
}) {
  const { orderNumber, t: accessToken } = await searchParams;

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

  // The order number is not a secret: delivery details are only shown to the owner, staff,
  // or someone holding the private link (token) that was sent to the buyer.
  if (!(await canAccessOrder(order, accessToken))) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Link Pesanan Tidak Valid</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Demi keamanan, detail pesanan hanya bisa dibuka lewat link pribadi dari email pesanan, atau setelah masuk ke akun Anda.
          Kehilangan link? Gunakan Lacak Pesanan, kami kirim ulang ke email pembeli.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Link href={`/track?orderNumber=${encodeURIComponent(orderNumber)}`} className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-xs font-bold text-slate-950">Lacak Pesanan</Link>
          <Link href="/login" className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-xs font-bold text-white">Masuk ke Akun</Link>
        </div>
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

        {/* Guest: one-click account from the buyer's own inbox (see ClaimAccountCard) */}
        {isGuestOrder && order.guestEmail && (
          <ClaimAccountCard orderNumber={order.orderNumber} accessToken={accessToken || ''} email={order.guestEmail} />
        )}

        {/* Invoice Link Action */}
        <div className="pt-2">
          <Link
            href={`/invoice/${order.orderNumber}${accessToken ? `?t=${encodeURIComponent(accessToken)}` : ''}`}
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
