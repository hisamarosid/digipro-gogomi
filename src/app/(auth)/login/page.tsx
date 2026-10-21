'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Eye, EyeOff, ShoppingBag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal login. Periksa email & password.');
      }

      toast.success('Login berhasil! Mengalihkan...');
      
      if (redirectTarget) {
        router.push(redirectTarget);
      } else if (data.data.user.role !== 'CUSTOMER') {
        router.push('/admin');
      } else {
        router.push('/account');
      }
    } catch (err: any) {
      toast.error(err.message || 'Login gagal. Periksa email & password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-xl text-white">
          <img src="/gogomi-logo.png" alt="Gogomi Digital Store" className="h-9 w-auto object-contain" />
          <span className="font-extrabold text-lg tracking-tight text-white">
            Gogomi<span className="text-cyan-400"> Store</span>
          </span>
        </Link>
        <h1 className="text-xl font-bold text-white">Masuk ke Akun Anda</h1>
        <p className="text-xs text-slate-400">Kelola lisensi, kredensial, dan pesanan digital Anda</p>
      </div>

      {redirectTarget === '/checkout' && (
        <div className="p-3.5 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-200 text-xs flex items-center gap-2.5">
          <ShoppingBag className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>
            Silakan masuk untuk mengaktifkan pengisian otomatis data nama/email dan penggunaan Store Coins saat checkout!
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-300 font-medium mb-1">Email *</label>
          <input
            type="email"
            required
            placeholder="nama@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-slate-300 font-medium">Password *</label>
            <Link href="/forgot-password" className="text-[11px] text-cyan-400 hover:underline">
              Lupa Password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 py-3 font-bold text-slate-950 transition disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Masuk Sekarang</span>}
        </button>
      </form>

      <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
        Belum punya akun?{' '}
        <Link
          href={redirectTarget ? `/register?redirect=${encodeURIComponent(redirectTarget)}` : '/register'}
          className="font-bold text-cyan-400 hover:underline"
        >
          Daftar Akun Baru
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-cyan-400 mx-auto" />}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
