'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, MailCheck, LogIn, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface TrackResult {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: Array<{ productName: string; variantName: string; quantity: number }>;
  access: 'EMAIL_SENT' | 'LOGIN' | 'NONE';
  payPath?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Menunggu pembayaran',
  PAID: 'Dibayar, sedang diproses',
  PROCESSING: 'Sedang diproses',
  NEEDS_FULFILLMENT: 'Dibayar, menunggu stok',
  COMPLETED: 'Selesai',
  EXPIRED: 'Kedaluwarsa',
  CANCELLED: 'Dibatalkan',
  REFUNDED: 'Dana dikembalikan',
  FAILED: 'Gagal',
};

export function TrackOrderClient() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') || '');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, email }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setResult(json.data);
      } else {
        toast.error(json.error || 'Pesanan tidak ditemukan');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-extrabold text-white">Lacak Pesanan</h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Masukkan nomor pesanan dan email yang dipakai saat checkout. Kami kirim link pribadi untuk membuka produk Anda, tanpa perlu login.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Nomor Pesanan</label>
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="ORD-261022-ABC123"
            required
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Email Saat Checkout</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@contoh.com"
            required
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 py-3 text-sm font-bold text-slate-950 transition disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span>{isLoading ? 'Memeriksa...' : 'Lacak Pesanan'}</span>
        </button>
      </form>

      {result && (
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-mono font-bold text-cyan-400">{result.orderNumber}</span>
            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-white">
              {STATUS_LABEL[result.status] || result.status}
            </span>
          </div>
          <ul className="space-y-1 text-slate-300">
            {result.items.map((item, i) => (
              <li key={i}>
                {item.productName} <span className="text-slate-500">({item.variantName}) x{item.quantity}</span>
              </li>
            ))}
          </ul>

          {result.access === 'EMAIL_SENT' && (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-emerald-300">
              <MailCheck className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Link pribadi pesanan sudah dikirim ke email Anda. Cek inbox dan folder spam.</span>
            </div>
          )}
          {result.access === 'LOGIN' && (
            <Link href="/login?redirect=/account/orders" className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2.5 font-bold text-slate-950">
              <LogIn className="h-4 w-4" />
              <span>Masuk untuk Melihat Pesanan</span>
            </Link>
          )}
          {result.access === 'NONE' && result.payPath && (
            <Link href={result.payPath} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 font-bold text-white">
              <CreditCard className="h-4 w-4" />
              <span>Lanjutkan Pembayaran</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
