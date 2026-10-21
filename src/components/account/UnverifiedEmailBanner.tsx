'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UnverifiedEmailBannerProps {
  userEmail: string;
}

export function UnverifiedEmailBanner({ userEmail }: UnverifiedEmailBannerProps) {
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
        throw new Error(data.error || 'Gagal mengirim ulang email');
      }

      toast.success('Email verifikasi baru berhasil dikirim ke ' + userEmail);
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
    <div className="mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <Mail className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <h4 className="font-bold text-white text-xs sm:text-sm">Akun Belum Terverifikasi</h4>
          <p className="text-[11px] text-amber-300/80">
            Verifikasi email Anda (<strong className="text-white font-mono">{userEmail}</strong>) untuk membuka seluruh fitur eksklusif member Gogomi Store.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
        <button
          onClick={handleResend}
          disabled={isSending || cooldown > 0}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSending ? 'animate-spin' : ''}`} />
          <span>{cooldown > 0 ? `Tunggu (${cooldown}s)` : 'Kirim Ulang Email'}</span>
        </button>

        <Link
          href="/verify-email"
          className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700"
        >
          <span>Verifikasi Email</span>
        </Link>
      </div>
    </div>
  );
}
