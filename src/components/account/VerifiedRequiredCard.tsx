'use client';

import React, { useState } from 'react';
import { Mail, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface VerifiedRequiredCardProps {
  title?: string;
  description?: string;
  userEmail?: string;
}

export function VerifiedRequiredCard({
  title = 'Fitur Eksklusif Member Terverifikasi',
  description = 'Verifikasi alamat email Anda terlebih dahulu untuk membuka fitur Store Coins, Loyalty Tier, Garansi Replacement, dan benefit member lainnya.',
  userEmail,
}: VerifiedRequiredCardProps) {
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleResend = async () => {
    if (cooldown > 0 || isSending) return;
    setIsSending(true);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengirim email verifikasi');
      }

      toast.success('Link verifikasi email berhasil dikirim!');
      setCooldown(60);

      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim email verifikasi');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-3xl glass-panel border border-amber-500/30 bg-slate-900/80 p-8 text-center max-w-lg mx-auto space-y-5 shadow-2xl">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
        <ShieldAlert className="h-8 w-8 animate-pulse" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-black text-white">{title}</h3>
        <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
      </div>

      {userEmail && (
        <div className="inline-block bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-cyan-400">
          {userEmail}
        </div>
      )}

      <div className="pt-2">
        <button
          onClick={handleResend}
          disabled={isSending || cooldown > 0}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-bold text-slate-950 transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isSending ? 'animate-spin' : ''}`} />
          <span>{cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : 'Kirim Email Verifikasi'}</span>
        </button>
      </div>
    </div>
  );
}
