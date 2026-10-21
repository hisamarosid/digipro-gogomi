'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Mail, ShieldCheck, Save, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerUnifiedNotificationSettingsPage() {
  const [preferences, setPreferences] = useState<any>({
    emailOrderUpdates: true,
    emailReplacements: true,
    emailCoins: true,
    emailPromotions: false,
    emailSubscriptions: true,
    emailWaitlist: true,
    emailPriceAlerts: true,
    emailReferrals: true,
    emailSupport: true,
    inAppSubscriptions: true,
    inAppWaitlist: true,
    inAppPriceAlerts: true,
    inAppCoins: true,
    inAppReferrals: true,
    inAppPromotions: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchPreferences() {
      try {
        const res = await fetch('/api/account/email/preferences');
        const json = await res.json();
        if (res.ok && json.success) {
          setPreferences(json.data);
        }
      } catch {
        toast.error('Gagal memuat pengaturan preferensi notifikasi');
      } finally {
        setIsLoading(false);
      }
    }
    fetchPreferences();
  }, []);

  const handleToggle = (key: string) => {
    setPreferences((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/account/email/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Pengaturan preferensi email & in-app berhasil disimpan');
      } else {
        toast.error(json.error || 'Gagal menyimpan preferensi');
      }
    } catch {
      toast.error('Gagal menyimpan preferensi notifikasi');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="animate-spin h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4" />
        Memuat Pengaturan Notifikasi & Email...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
          <Mail className="h-7 w-7 text-cyan-400" />
          <span>Pengaturan Preferensi Email & Web Notification</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Kelola notifikasi di dalam website maupun pesan yang dikirimkan ke alamat email Anda.
        </p>
      </div>

      {/* Wajib Aktif */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Email Transaksional Utama (Wajib Aktif)
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Email penting terkait konfirmasi pembayaran, akses produk digital, garansi replacement, reset password, dan keamanan akun selalu aktif untuk kenyamanan dan keamanan Anda.
        </p>
      </div>

      {/* Preferences Grid */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Pengaturan Channel Email Opsional
        </h2>

        <div className="space-y-4 divide-y divide-slate-800/60 text-xs">
          <div className="pt-3 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Pengingat Langganan & Renewal</h3>
              <p className="text-slate-400">Email pemberitahuan 7 hari, 3 hari, dan 1 hari sebelum masa aktif berakhir.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailSubscriptions}
              onChange={() => handleToggle('emailSubscriptions')}
              className="h-5 w-5 rounded border-slate-800 bg-slate-950 text-cyan-500 cursor-pointer"
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Restock Produk Waitlist</h3>
              <p className="text-slate-400">Email saat stok produk favorit yang Anda tanyakan kembali tersedia.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailWaitlist}
              onChange={() => handleToggle('emailWaitlist')}
              className="h-5 w-5 rounded border-slate-800 bg-slate-950 text-cyan-500 cursor-pointer"
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Penurunan Harga (Price Alert Email)</h3>
              <p className="text-slate-400">Email pemberitahuan jika harga produk impian Anda mengalami penurunan.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailPriceAlerts}
              onChange={() => handleToggle('emailPriceAlerts')}
              className="h-5 w-5 rounded border-slate-800 bg-slate-950 text-cyan-500 cursor-pointer"
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Reward Store Coins</h3>
              <p className="text-slate-400">Email notifikasi koin belanja aktif dan pengingat koin kedaluwarsa.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailCoins}
              onChange={() => handleToggle('emailCoins')}
              className="h-5 w-5 rounded border-slate-800 bg-slate-950 text-cyan-500 cursor-pointer"
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Program Referral Teman</h3>
              <p className="text-slate-400">Email pemberitahuan saat teman mendaftar menggunakan kode referral Anda.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailReferrals}
              onChange={() => handleToggle('emailReferrals')}
              className="h-5 w-5 rounded border-slate-800 bg-slate-950 text-cyan-500 cursor-pointer"
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Promosi & Kupon Diskon VIP</h3>
              <p className="text-slate-400">Email promo khusus dan penawaran kupon belanja potongan harga.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailPromotions}
              onChange={() => handleToggle('emailPromotions')}
              className="h-5 w-5 rounded border-slate-800 bg-slate-950 text-cyan-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Preferensi'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
