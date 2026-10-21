'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ShoppingBag, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PasswordStrengthChecklist } from '@/components/auth/PasswordStrengthChecklist';
import { isAllowedEmailDomain, EMAIL_DOMAIN_ERROR_MESSAGE, validatePasswordStrength } from '@/lib/auth/validation';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const emailTrimmed = email.trim();
  const isEmailValidDomain = emailTrimmed.includes('@') ? isAllowedEmailDomain(emailTrimmed) : null;
  const passwordStrength = validatePasswordStrength(password);
  const isPasswordMatch = confirmPassword.length > 0 ? password === confirmPassword : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAllowedEmailDomain(emailTrimmed)) {
      toast.error(EMAIL_DOMAIN_ERROR_MESSAGE);
      return;
    }

    if (!passwordStrength.isValid) {
      toast.error(`Password belum memenuhi syarat: ${passwordStrength.errors.join(', ')}`);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok dengan password.');
      return;
    }

    if (!termsAccepted) {
      toast.error('Anda harus menyetujui Ketentuan Layanan dan Kebijakan Privasi.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: emailTrimmed,
          password,
          referralCode: referralCode.trim(),
          termsAccepted,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mendaftar');
      }

      toast.success('Pendaftaran akun berhasil! Silakan periksa email untuk verifikasi.');

      if (redirectTarget) {
        router.push(redirectTarget);
      } else {
        router.push('/account');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal mendaftar. Periksa kembali data Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl">
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-xl text-white mb-1">
          <img src="/gogomi-logo.png" alt="Gogomi Digital Store" className="h-9 w-auto object-contain" />
          <span className="font-extrabold text-lg tracking-tight text-white">
            Gogomi<span className="text-cyan-400"> Store</span>
          </span>
        </Link>
        <h1 className="text-xl font-bold text-white">Buat Akun Baru</h1>
        <p className="text-xs text-slate-400">Dapatkan akses instan ke seluruh pesanan digital Anda</p>
      </div>

      {redirectTarget === '/checkout' && (
        <div className="p-3.5 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-200 text-xs flex items-center gap-2.5">
          <ShoppingBag className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>
            Daftar akun sekarang untuk otomatis menyimpan data checkout dan mendapatkan bonus Store Coins!
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-300 font-medium mb-1">Nama Lengkap *</label>
          <input
            type="text"
            required
            placeholder="Contoh: Budi Santoso"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1">Email *</label>
          <input
            type="email"
            required
            placeholder="nama@gmail.com / outlook / hotmail / yahoo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full rounded-xl bg-slate-950 border p-3 text-white placeholder-slate-500 focus:outline-none transition ${isEmailValidDomain === false
                ? 'border-rose-500/80 focus:border-rose-500'
                : isEmailValidDomain === true
                  ? 'border-emerald-500/80 focus:border-emerald-500'
                  : 'border-slate-800 focus:border-cyan-500'
              }`}
          />
          {isEmailValidDomain === false && (
            <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Gunakan email Gmail, Outlook, Hotmail, atau Yahoo.</span>
            </p>
          )}
          {isEmailValidDomain === true && (
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Domain email didukung.</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1">Password *</label>
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

        {/* Live Password Strength Checklist */}
        <PasswordStrengthChecklist password={password} />

        <div>
          <label className="block text-slate-300 font-medium mb-1">Konfirmasi Password *</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              placeholder="Ulangi password Anda"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full rounded-xl bg-slate-950 border p-3 text-white placeholder-slate-500 focus:outline-none pr-10 ${confirmPassword && !isPasswordMatch
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

        <div>
          <label className="block text-slate-300 font-medium mb-1">
            Kode Referral Teman (Opsional)
          </label>
          <input
            type="text"
            placeholder="Contoh: DANA03"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white font-mono uppercase placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Terms Agreement Checkbox */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 shrink-0"
            />
            <span className="text-slate-300 text-xs leading-relaxed">
              Saya telah membaca dan menyetujui{' '}
              <Link href="/terms" target="_blank" className="text-cyan-400 hover:underline font-semibold">
                Ketentuan Layanan
              </Link>{' '}
              dan{' '}
              <Link href="/privacy" target="_blank" className="text-cyan-400 hover:underline font-semibold">
                Kebijakan Privasi
              </Link>
              .
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading || !termsAccepted || !passwordStrength.isValid || !isPasswordMatch}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 py-3 font-bold text-slate-950 transition disabled:opacity-50 shadow-lg shadow-cyan-500/20"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Daftar Akun Sekarang</span>}
        </button>
      </form>

      <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
        Sudah memiliki akun?{' '}
        <Link
          href={redirectTarget ? `/login?redirect=${encodeURIComponent(redirectTarget)}` : '/login'}
          className="font-bold text-cyan-400 hover:underline"
        >
          Masuk Sekarang
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-cyan-400 mx-auto" />}>
        <RegisterContent />
      </Suspense>
    </div>
  );
}
