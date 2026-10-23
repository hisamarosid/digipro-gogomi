'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PasswordStrengthChecklist } from '@/components/auth/PasswordStrengthChecklist';
import { validatePasswordStrength } from '@/lib/auth/validation';

export function ClaimAccountClient() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';

  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'hasAccount'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/account/claim/complete?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.success) {
          setEmail(json.data.email);
          setName(json.data.name || '');
          setState('ready');
        } else {
          setMessage(json.error || 'Link tidak valid.');
          setState(json.hasAccount ? 'hasAccount' : 'invalid');
        }
      } catch {
        if (!cancelled) {
          setMessage('Terjadi kesalahan jaringan.');
          setState('invalid');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const strength = validatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strength.isValid) {
      toast.error(`Password belum memenuhi syarat: ${strength.errors.join(', ')}`);
      return;
    }
    if (password !== confirm) {
      toast.error('Konfirmasi password tidak cocok.');
      return;
    }
    if (!termsAccepted) {
      toast.error('Anda harus menyetujui Ketentuan Layanan dan Kebijakan Privasi.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/account/claim/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password, termsAccepted }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Akun aktif! Pesanan Anda sudah tersimpan.');
        router.push('/account/products');
        router.refresh();
      } else {
        toast.error(json.error || 'Gagal membuat akun');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (state !== 'ready') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center space-y-4">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-400" />
        <h1 className="text-xl font-bold text-white">{state === 'hasAccount' ? 'Email Sudah Terdaftar' : 'Link Tidak Valid'}</h1>
        <p className="text-xs text-slate-400">{message}</p>
        <Link href="/login" className="inline-block rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950">
          Masuk ke Akun
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-5">
      <div className="text-center space-y-2">
        <UserCheck className="mx-auto h-9 w-9 text-emerald-400" />
        <h1 className="text-2xl font-extrabold text-white">Aktifkan Akun Anda</h1>
        <p className="text-xs text-slate-400">
          Buat password untuk <strong className="font-mono text-white">{email}</strong>. Semua pesanan dengan email ini akan tersimpan di akun Anda.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-4 text-xs">
        <div className="space-y-1.5">
          <label className="font-bold uppercase tracking-wide text-slate-400 text-[11px]">Nama</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-bold uppercase tracking-wide text-slate-400 text-[11px]">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 pr-10 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-3 text-slate-500 hover:text-white"
              aria-label="Tampilkan password"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrengthChecklist password={password} />
        </div>
        <div className="space-y-1.5">
          <label className="font-bold uppercase tracking-wide text-slate-400 text-[11px]">Ulangi Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <label className="flex items-start gap-2 text-slate-300 leading-relaxed">
          <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-0.5" />
          <span>
            Saya menyetujui <Link href="/terms" className="text-cyan-400 underline">Ketentuan Layanan</Link> dan{' '}
            <Link href="/privacy" className="text-cyan-400 underline">Kebijakan Privasi</Link>.
          </span>
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3 text-sm font-bold text-slate-950 transition disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>Aktifkan Akun &amp; Simpan Pesanan</span>
        </button>
      </form>
    </div>
  );
}
