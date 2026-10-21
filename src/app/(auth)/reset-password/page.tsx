'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PasswordStrengthChecklist } from '@/components/auth/PasswordStrengthChecklist';
import { validatePasswordStrength } from '@/lib/auth/validation';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordStrength = validatePasswordStrength(password);
  const isPasswordMatch = confirmPassword.length > 0 ? password === confirmPassword : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Token reset password tidak ditemukan pada URL.');
      return;
    }

    if (!passwordStrength.isValid) {
      toast.error(`Password belum memenuhi syarat: ${passwordStrength.errors.join(', ')}`);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mereset password');
      }

      setIsSuccess(true);
      toast.success('Password berhasil diperbarui!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mereset password.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-md space-y-6 rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl">
        <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white">Tautan Tidak Valid</h2>
          <p className="text-xs text-slate-400">
            Token reset password tidak ditemukan. Silakan minta tautan reset baru.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-block w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 py-3 text-xs font-bold text-slate-950 transition"
        >
          Minta Tautan Reset Baru
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl">
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-xl text-white mb-1">
          <img src="/gogomi-logo.png" alt="Gogomi Digital Store" className="h-9 w-auto object-contain" />
          <span className="font-extrabold text-lg tracking-tight text-white">
            Gogomi<span className="text-cyan-400"> Store</span>
          </span>
        </Link>
        <h1 className="text-xl font-bold text-white">Buat Password Baru</h1>
        <p className="text-xs text-slate-400">
          Masukkan password baru yang kuat untuk mengamankan akun Anda
        </p>
      </div>

      {isSuccess ? (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-center space-y-4 animate-in fade-in duration-300">
          <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-white text-sm">Password Berhasil Diubah!</h3>
            <p className="text-xs text-slate-300">
              Password akun Anda telah berhasil diperbarui. Silakan masuk menggunakan password baru Anda.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 py-3 text-xs font-bold text-slate-950 transition shadow-lg shadow-cyan-500/20"
            >
              Masuk ke Akun Sekarang
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Password Baru *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <PasswordStrengthChecklist password={password} />

          <div>
            <label className="block text-slate-300 font-medium mb-1">Konfirmasi Password Baru *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="Ulangi password baru Anda"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full rounded-xl bg-slate-950 border p-3 text-white placeholder-slate-500 focus:outline-none pr-10 ${
                  confirmPassword && !isPasswordMatch
                    ? 'border-rose-500/80 focus:border-rose-500'
                    : 'border-slate-800 focus:border-cyan-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && !isPasswordMatch && (
              <p className="text-[11px] text-rose-400 mt-1">Konfirmasi password tidak cocok.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !passwordStrength.isValid || !isPasswordMatch}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 py-3 font-bold text-slate-950 transition disabled:opacity-50 shadow-lg shadow-cyan-500/20"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Simpan Password Baru</span>}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-cyan-400 mx-auto" />}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
