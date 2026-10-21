'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, RefreshCw, Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'already_verified' | 'expired' | 'error' | 'idle'>(
    token ? 'loading' : 'idle'
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok && data.success) {
          if (data.alreadyVerified) {
            setStatus('already_verified');
          } else {
            setStatus('success');
            toast.success('Email berhasil diverifikasi!');
          }
        } else if (data.isExpired) {
          setStatus('expired');
          setErrorMessage(data.error || 'Link verifikasi sudah kedaluwarsa.');
        } else {
          setStatus('error');
          setErrorMessage(data.error || 'Link verifikasi tidak valid.');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err?.message || 'Terjadi kesalahan saat memverifikasi email.');
      }
    };

    verifyToken();
  }, [token]);

  const handleResend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: manualEmail || undefined }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengirim email verifikasi');
      }

      toast.success(data.message || 'Link verifikasi baru telah dikirimkan!');
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
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl text-center">
      <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-xl text-white mb-2">
        <img src="/gogomi-logo.png" alt="Gogomi Digital Store" className="h-9 w-auto object-contain" />
        <span className="font-extrabold text-lg tracking-tight text-white">
          Gogomi<span className="text-cyan-400"> Store</span>
        </span>
      </Link>

      {/* Loading State */}
      {status === 'loading' && (
        <div className="py-12 space-y-4">
          <Loader2 className="h-12 w-12 text-cyan-400 animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-white">Memverifikasi Alamat Email...</h2>
          <p className="text-xs text-slate-400">Mohon tunggu sebentar selagi kami memvalidasi akun Anda.</p>
        </div>
      )}

      {/* Success State */}
      {status === 'success' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-white">Email Berhasil Diverifikasi! 🎉</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Selamat! Akun Anda kini telah aktif sepenuhnya. Seluruh benefit member seperti Store Coins, Loyalty VIP, dan klaim garansi dapat Anda nikmati.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/account"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:opacity-95"
            >
              <span>Buka Dashboard Akun</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Already Verified State */}
      {status === 'already_verified' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="h-16 w-16 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
            <Sparkles className="h-9 w-9" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-white">Email Sudah Terverifikasi</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Akun Anda sudah memiliki status terverifikasi sebelumnya. Tidak ada tindakan lanjutan yang diperlukan.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/account"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 py-3 text-xs font-bold text-slate-950 transition shadow-lg shadow-cyan-500/20"
            >
              <span>Kembali ke Akun Saya</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Expired State */}
      {status === 'expired' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="h-16 w-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
            <AlertCircle className="h-9 w-9" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-white">Link Verifikasi Sudah Kedaluwarsa</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Demi keamanan, link verifikasi email hanya berlaku 24 jam. Silakan minta tautan baru di bawah ini.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => handleResend()}
              disabled={isResending || cooldown > 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-bold text-slate-950 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
              <span>{cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : 'Kirim Link Baru'}</span>
            </button>
            <Link
              href="/login"
              className="inline-block text-xs text-slate-400 hover:text-white transition"
            >
              Kembali ke Halaman Masuk
            </Link>
          </div>
        </div>
      )}

      {/* Error or Idle State (Manual Request Form) */}
      {(status === 'error' || status === 'idle') && (
        <div className="space-y-5 text-left">
          {status === 'error' && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMessage || 'Tautan verifikasi tidak valid atau telah digunakan.'}</span>
            </div>
          )}

          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-white">Verifikasi Alamat Email</h2>
            <p className="text-xs text-slate-400">
              Masukkan email akun Anda untuk mendapatkan tautan verifikasi baru.
            </p>
          </div>

          <form onSubmit={handleResend} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Email Akun Anda *</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="nama@example.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none pl-10"
                />
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isResending || cooldown > 0 || !manualEmail}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 py-3 font-bold text-slate-950 transition disabled:opacity-50 shadow-lg shadow-cyan-500/20"
            >
              {isResending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>{cooldown > 0 ? `Tunggu (${cooldown}s)` : 'Kirim Email Verifikasi'}</span>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
            <Link href="/login" className="hover:text-white transition">
              Kembali ke Halaman Masuk
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-cyan-400 mx-auto" />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
