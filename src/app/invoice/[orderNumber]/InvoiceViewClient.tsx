'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import { 
  Printer, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Copy, 
  Check
} from 'lucide-react';

interface InvoiceViewClientProps {
  order: {
    id: string;
    orderNumber: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    discountAmount: number;
    grandTotal: number;
    coinUsed: number;
    coinDiscountAmount: number;
    tierDiscountAmount: number;
    guestName?: string | null;
    guestEmail?: string | null;
    guestPhone?: string | null;
    user?: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
    coupon?: {
      code?: string;
      discountPercent?: number | null;
      discountAmount?: number | null;
    } | null;
    items: Array<{
      id: string;
      productName: string;
      variantName: string;
      sku: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
      warrantyDays: number;
    }>;
    payments?: Array<{
      id: string;
      provider: string;
      externalTransactionId?: string | null;
      amount: number;
      status: string;
      createdAt: string | Date;
      updatedAt: string | Date;
    }>;
  };
  siteUrl: string;
}

export function InvoiceViewClient({ order, siteUrl }: InvoiceViewClientProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isPaid = order.status === 'PAID' || order.status === 'COMPLETED' || order.paymentStatus === 'PAID';
  const customerName = order.user?.name || order.guestName || 'Pelanggan Gogomi';
  const customerEmail = order.user?.email || order.guestEmail || '-';
  const customerPhone = order.user?.phone || order.guestPhone || '-';

  const invoiceUrl = `${siteUrl}/invoice/${order.orderNumber}`;
  const latestPayment = order.payments && order.payments.length > 0 ? order.payments[0] : null;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(invoiceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white print:text-black">
      {/* Top Action Toolbar (Hidden during Print/PDF) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/account/orders`}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Riwayat Pesanan</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Salin Tautan</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak / Unduh PDF</span>
          </button>
        </div>
      </div>

      {/* Main Printable Invoice Paper */}
      <div 
        id="invoice-paper"
        className="max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-10 border border-slate-200 print:border-0 print:shadow-none print:p-0 print:rounded-none"
      >
        {/* Header: Brand & Invoice Meta */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                G
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">GOGOMI STORE</h1>
                <p className="text-[11px] font-medium text-slate-500">Pusat Layanan &amp; Produk Digital Terpercaya</p>
              </div>
            </div>

            <div className="text-xs text-slate-500 space-y-0.5 pt-1">
              <p>Website: <span className="font-semibold text-blue-600">https://gogomi.store</span></p>
              <p>Email: <span className="font-semibold text-slate-700">support@gogomi.store</span></p>
              <p>WhatsApp CS: <span className="font-semibold text-slate-700">Aktif 24/7 di Help Center</span></p>
            </div>
          </div>

          <div className="sm:text-right space-y-2">
            <span className="inline-block text-xs font-bold tracking-widest text-slate-400 uppercase">
              FAKTUR PEMBAYARAN RESMI
            </span>
            <div className="text-2xl font-mono font-black text-slate-950">
              INV/{order.orderNumber}
            </div>

            <div className="flex sm:justify-end items-center gap-2 pt-1">
              {isPaid ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 font-extrabold text-xs uppercase tracking-wide">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>LUNAS / PAID</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-700 font-extrabold text-xs uppercase tracking-wide">
                  <Clock className="h-3.5 w-3.5" />
                  <span>MENUNGGU PEMBAYARAN</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
          {/* Bill To */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Diterbitkan Kepada (Bill To)
            </span>
            <p className="text-sm font-bold text-slate-900">{customerName}</p>
            <p className="text-slate-600">Email: <span className="font-mono text-slate-800">{customerEmail}</span></p>
            {customerPhone && customerPhone !== '-' && (
              <p className="text-slate-600">Telepon / WhatsApp: <span className="font-mono text-slate-800">{customerPhone}</span></p>
            )}
          </div>

          {/* Payment & Date Details */}
          <div className="sm:text-right space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Rincian Transaksi
            </span>
            <p className="text-slate-600">
              Tanggal Pesanan: <span className="font-semibold text-slate-800">{formatDateJakarta(order.createdAt)}</span>
            </p>
            <p className="text-slate-600">
              Metode Pembayaran: <span className="font-semibold text-slate-800">QRIS Realtime (AutoGoPay)</span>
            </p>
            {latestPayment?.externalTransactionId && (
              <p className="text-slate-600">
                Ref Gateway: <span className="font-mono text-[11px] text-slate-700">{latestPayment.externalTransactionId}</span>
              </p>
            )}
            <p className="text-slate-600">
              Status Invoice: <span className="font-bold text-slate-900">{isPaid ? 'Sudah Terverifikasi' : 'Menunggu Konfirmasi'}</span>
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-900 text-[11px] font-bold text-slate-900 uppercase">
                  <th className="py-3 pr-2 w-8">No.</th>
                  <th className="py-3 px-2">Deskripsi Produk &amp; Paket</th>
                  <th className="py-3 px-2 text-center w-24">Garansi</th>
                  <th className="py-3 px-2 text-center w-12">Qty</th>
                  <th className="py-3 px-2 text-right w-28">Harga Satuan</th>
                  <th className="py-3 pl-2 text-right w-32">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, idx) => (
                  <tr key={item.id} className="text-slate-800">
                    <td className="py-3.5 pr-2 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3.5 px-2">
                      <p className="font-bold text-slate-900 text-xs">{item.productName}</p>
                      <p className="text-[11px] text-blue-600 font-medium">{item.variantName}</p>
                      {item.sku && (
                        <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <ShieldCheck className="h-3 w-3" />
                        <span>{item.warrantyDays} Hari</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-center font-bold text-slate-900">{item.quantity}</td>
                    <td className="py-3.5 px-2 text-right font-mono text-slate-700">{formatIDR(item.unitPrice)}</td>
                    <td className="py-3.5 pl-2 text-right font-mono font-bold text-slate-900">{formatIDR(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Calculation Box */}
        <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row justify-between items-start gap-6">
          {/* Note / Terms on the left */}
          <div className="space-y-2 max-w-sm text-xs text-slate-500">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Catatan &amp; Ketentuan Garansi:</h4>
            <ul className="space-y-1 list-disc list-inside text-[11px] leading-relaxed">
              <li>Layanan digital dikirimkan langsung secara instan dan otomatis.</li>
              <li>Garansi aktif sesuai durasi masing-masing item terhitung sejak waktu transaksi.</li>
              <li>Simpan nomor invoice ini untuk keperluan layanan pelanggan atau klaim garansi resmi.</li>
            </ul>
          </div>

          {/* Calculations on the right */}
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal Produk</span>
              <span className="font-mono font-semibold text-slate-900">{formatIDR(order.totalAmount)}</span>
            </div>

            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Diskon Kupon {order.coupon?.code ? `(${order.coupon.code})` : ''}</span>
                <span className="font-mono font-semibold">- {formatIDR(order.discountAmount)}</span>
              </div>
            )}

            {order.coinDiscountAmount > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Diskon Koin Toko ({order.coinUsed} Coins)</span>
                <span className="font-mono font-semibold">- {formatIDR(order.coinDiscountAmount)}</span>
              </div>
            )}

            {order.tierDiscountAmount > 0 && (
              <div className="flex justify-between text-indigo-600">
                <span>Diskon Loyalitas Member</span>
                <span className="font-mono font-semibold">- {formatIDR(order.tierDiscountAmount)}</span>
              </div>
            )}

            <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-baseline">
              <span className="font-bold text-slate-950 uppercase text-xs">Total Pembayaran</span>
              <span className="font-mono font-black text-lg text-blue-600">{formatIDR(order.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Official Footer Verification */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs text-slate-500">
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">
              Dokumen ini merupakan bukti pembayaran sah yang diterbitkan secara elektronik oleh sistem Gogomi Store.
            </p>
            <p className="text-[10px] text-slate-400">
              Dicetak pada: {mounted ? formatDateJakarta(new Date()) : formatDateJakarta(order.createdAt)} • No. Verifikasi: {order.orderNumber}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(invoiceUrl)}`}
              alt="QR Verifikasi Invoice"
              className="h-16 w-16 rounded border border-slate-300 p-0.5"
            />
            <div className="text-left text-[10px] text-slate-400">
              <span className="font-bold text-slate-600 block">Scan QR Code</span>
              <span>Untuk verifikasi keaslian faktur online</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
