'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { UserPlus, Loader2, MailCheck } from 'lucide-react';
import { toast } from 'sonner';

/** Guest orders: one click sends an activation link to the buyer's own email. */
export function ClaimAccountCard({
  orderNumber,
  accessToken,
  email,
}: {
  orderNumber: string;
  accessToken: string;
  email: string;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'hasAccount'>('idle');
  const [maskedEmail, setMaskedEmail] = useState('');

  const handleClick = async () => {
    setState('sending');
    try {
      const res = await fetch('/api/account/claim/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, t: accessToken }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMaskedEmail(json.data.email);
        setState(json.data.status === 'HAS_ACCOUNT' ? 'hasAccount' : 'sent');
      } else {
        toast.error(json.error || 'Gagal mengirim link');
        setState('idle');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
      setState('idle');
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-cyan-950/60 to-blue-950/60 border border-cyan-500/30 p-4 space-y-3 mt-4">
      <div className="flex items-start gap-2.5">
        <UserPlus className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-xs text-white">Simpan Pesanan ke Akun (Opsional)</h4>
          <p className="text-[11px] text-cyan-200/80 leading-relaxed">
            Tidak wajib. Pesanan ini sudah bisa dibuka lewat link di email Anda. Kalau mau punya akun (klaim garansi, Store Coins),
            kami kirim link aktivasi ke <strong className="text-white font-mono">{email}</strong>, tinggal buat password.
          </p>
        </div>
      </div>

      {state === 'sent' && (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-[11px] text-emerald-300">
          <MailCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Link aktivasi dikirim ke {maskedEmail}. Cek inbox dan folder spam. Berlaku 24 jam.</span>
        </div>
      )}
      {state === 'hasAccount' && (
        <Link
          href={`/login?redirect=/account/orders`}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 py-2.5 text-xs font-bold text-slate-950 transition"
        >
          Email ini sudah punya akun, masuk untuk melihat pesanan
        </Link>
      )}
      {(state === 'idle' || state === 'sending') && (
        <button
          type="button"
          onClick={handleClick}
          disabled={state === 'sending'}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 py-2.5 text-xs font-bold text-slate-950 transition shadow-md shadow-cyan-500/20 disabled:opacity-60"
        >
          {state === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          <span>Kirim Link Aktivasi ke Email Saya</span>
        </button>
      )}
    </div>
  );
}
