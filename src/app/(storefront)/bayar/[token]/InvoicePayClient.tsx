'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { formatIDR } from '@/lib/utils/formatters';
import { isAllowedEmailDomain, EMAIL_DOMAIN_ERROR_MESSAGE } from '@/lib/auth/validation';

interface Props {
  token: string;
  title: string;
  amount: number;
  qty: number;
  note: string;
  expiresAt: string;
}

export function InvoicePayClient({ token, title, amount, qty, note, expiresAt }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const total = amount * qty;
  const mismatch = emailConfirm.length > 0 && emailConfirm.trim().toLowerCase() !== email.trim().toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowedEmailDomain(email.trim())) {
      toast.error(EMAIL_DOMAIN_ERROR_MESSAGE);
      return;
    }
    if (emailConfirm.trim().toLowerCase() !== email.trim().toLowerCase()) {
      toast.error('Konfirmasi email tidak sama.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/invoice/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, email, phone }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        try {
          if (json.data.guestToken) localStorage.setItem(`order_token_${json.data.orderNumber}`, json.data.guestToken);
        } catch {
          /* private mode: the email link still works */
        }
        router.push(`/payment/${json.data.orderNumber}`);
      } else {
        toast.error(json.error || 'Gagal memproses tagihan');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-5">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          <Receipt className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Tagihan Jasa</h1>
        <p className="text-xs text-slate-400">Dibuat oleh admin Gogomi Store</p>
      </div>

      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-3 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-slate-400">Jasa</span>
          <span className="text-right font-bold text-white">{title}</span>
        </div>
        {qty > 1 && (
          <div className="flex justify-between">
            <span className="text-slate-400">Harga satuan x jumlah</span>
            <span className="text-white">{formatIDR(amount)} x {qty}</span>
          </div>
        )}
        {note && (
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-slate-300 leading-relaxed whitespace-pre-wrap">{note}</div>
        )}
        <div className="flex justify-between items-center border-t border-slate-800 pt-3">
          <span className="text-slate-400">Total</span>
          <span className="text-xl font-black text-emerald-400">{formatIDR(total)}</span>
        </div>
        <p className="text-[10px] text-slate-500">
          Link berlaku sampai {new Date(expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-4 text-xs">
        <p className="font-bold text-white">Data Anda</p>
        <div className="space-y-1.5">
          <label className="font-bold uppercase tracking-wide text-slate-400 text-[11px]">Nama *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-bold uppercase tracking-wide text-slate-400 text-[11px]">Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="nama@gmail.com"
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-bold uppercase tracking-wide text-slate-400 text-[11px]">Ulangi Email *</label>
          <input
            type="email"
            value={emailConfirm}
            onChange={(e) => setEmailConfirm(e.target.value)}
            onPaste={(e) => e.preventDefault()}
            required
            className={`w-full rounded-xl bg-slate-950 border px-3 py-2.5 text-sm text-white focus:outline-none ${mismatch ? 'border-rose-500/80' : 'border-slate-800 focus:border-cyan-500'}`}
          />
          {mismatch && <p className="text-[11px] text-rose-400">Email belum sama.</p>}
        </div>
        <div className="space-y-1.5">
          <label className="font-bold uppercase tracking-wide text-slate-400 text-[11px]">Nomor WhatsApp</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="081234567890"
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || mismatch}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3 text-sm font-bold text-slate-950 transition disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          <span>Lanjut Bayar (QRIS) {formatIDR(total)}</span>
        </button>
        <p className="text-[10px] text-slate-500 text-center">Waktu bayar QRIS 15 menit setelah Anda menekan tombol ini.</p>
      </form>
    </div>
  );
}
