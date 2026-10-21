'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { User, ShieldCheck, KeyRound, Save, Mail, Phone, Lock, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateJakarta } from '@/lib/utils/formatters';
import { LogoutButton } from '@/components/auth/LogoutButton';

export function CustomerProfileClient({ user }: { user: any }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          name,
          phone,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Profil berhasil diperbarui!');
        router.refresh();
      } else {
        toast.error(json.error || 'Gagal memperbarui profil');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi jaringan');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Password baru dan konfirmasi password tidak cocok.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password baru minimal 8 karakter.');
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          currentPassword,
          newPassword,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Password berhasil diubah!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(json.error || 'Gagal mengubah password');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi jaringan');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <User className="h-6 w-6 text-blue-600 dark:text-cyan-400" />
          <span>{t('acc_profile_title')}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">{t('acc_profile_subtitle')}</p>
      </div>

      {/* Member Card Summary */}
      <div className="rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/60 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-cyan-400 font-black flex items-center justify-center text-2xl shrink-0 shadow-md">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-lg">{user?.name}</h3>
              {user?.emailVerified ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Terverifikasi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 shadow-sm shadow-amber-500/10">
                  <AlertTriangle className="h-3 w-3" /> Belum Verifikasi
                </span>
              )}
            </div>
            <p className="text-xs text-blue-600 dark:text-cyan-400 font-mono font-medium">{user?.email}</p>
            <p className="text-[11px] text-slate-400">Terdaftar sejak: <span className="font-semibold text-slate-300">{formatDateJakarta(user?.createdAt)}</span></p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
          <div className="flex items-center gap-2 bg-amber-500/10 px-3.5 py-2 rounded-2xl border border-amber-500/20 text-xs font-bold text-amber-500">
            <Sparkles className="h-4 w-4" />
            <span>Member VIP</span>
          </div>
          <LogoutButton variant="button" />
        </div>
      </div>

      {/* Personal Info Form */}
      <form onSubmit={handleUpdateProfile} className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4 text-xs">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <User className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
          <h3 className="font-bold text-white text-sm">Informasi Pribadi</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">Nama Lengkap</label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-600 dark:focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">Nomor WhatsApp / HP</label>
            <div className="relative">
              <input
                type="text"
                placeholder="081234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-600 dark:focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-slate-300">Alamat Email (Permanen)</label>
          <div className="relative">
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full rounded-xl bg-slate-900/40 border border-slate-800/60 px-3.5 py-2.5 text-slate-400 font-mono cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isUpdatingProfile}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-xs font-bold transition shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isUpdatingProfile ? 'Menyimpan...' : 'Simpan Profil'}</span>
          </button>
        </div>
      </form>

      {/* Change Password Form */}
      <form onSubmit={handleChangePassword} className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4 text-xs">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Lock className="h-4 w-4 text-rose-500" />
          <h3 className="font-bold text-white text-sm">Ubah Password Akun</h3>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-slate-300">Password Lama</label>
          <input
            type="password"
            required
            placeholder="Masukkan password Anda saat ini"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">Password Baru</label>
            <input
              type="password"
              required
              placeholder="Minimal 8 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">Konfirmasi Password Baru</label>
            <input
              type="password"
              required
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isChangingPassword}
            className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 text-xs font-bold transition shadow-md shadow-rose-500/20 disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4" />
            <span>{isChangingPassword ? 'Memproses...' : 'Ubah Password'}</span>
          </button>
        </div>
      </form>

    </div>
  );
}
