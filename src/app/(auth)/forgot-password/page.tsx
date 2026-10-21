'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses permintaan reset');
      }

      setIsSubmitted(true);
      toast.success('Permintaan reset password berhasil dikirim.');
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat memproses reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-xl text-white mb-1">
            <img src="/gogomi-logo.png" alt="Gogomi Digital Store" className="h-9 w-auto object-contain" />
            <span className="font-extrabold text-lg tracking-tight text-white">
              Gogomi<span className="text-cyan-400"> Store</span>
            </span>
          </Link>
          <h1 className="text-xl font-bold text-white">Lupa Password Akun</h1>
          <p className="text-xs text-slate-400">
            Masukkan alamat email akun Anda untuk menerima petunjuk dan tautan reset password.
          </p>
        </div>

        {isSubmitted ? (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-center space-y-4 animate-in fade-in duration-300">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-white text-sm">Petunjuk Terkirim!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Jika email <strong className="text-white font-mono">{email}</strong> terdaftar di Gogomi Store, kami telah mengirimkan tautan reset password.
              </p>
            </div>
            <p className="text-[11px] text-slate-400">
              Tautan berlaku selama 60 menit. Periksa folder spam/inbox Anda.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-white transition border border-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Kembali ke Halaman Masuk</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Email Terdaftar *</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="nama@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none pl-10"
                />
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 py-3 font-bold text-slate-950 transition disabled:opacity-50 shadow-lg shadow-cyan-500/20"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Kirim Petunjuk Reset Password</span>}
            </button>

            <div className="text-center text-xs text-slate-400 pt-3 border-t border-slate-800">
              Ingat password Anda?{' '}
              <Link href="/login" className="font-bold text-cyan-400 hover:underline">
                Masuk di Sini
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
