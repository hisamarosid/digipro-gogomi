'use client';

import React, { useEffect, useState } from 'react';
import { Bell, ShieldCheck, Save, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerNotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<any>({
    inAppSubscriptions: true,
    inAppRenewals: true,
    inAppWaitlist: true,
    inAppPriceAlerts: true,
    inAppReferrals: true,
    inAppCoins: true,
    inAppPromotions: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchPreferences() {
      try {
        const res = await fetch('/api/account/notifications/preferences');
        const json = await res.json();
        if (res.ok && json.success) {
          setPreferences(json.data);
        }
      } catch {
        toast.error('Gagal memuat pengaturan notifikasi');
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
      const res = await fetch('/api/account/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Pengaturan notifikasi web berhasil disimpan');
      } else {
        toast.error(json.error || 'Gagal menyimpan pengaturan');
      }
    } catch {
      toast.error('Gagal menyimpan pengaturan notifikasi');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="animate-spin h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4" />
        Memuat Pengaturan Notifikasi...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
          <Bell className="h-7 w-7 text-cyan-400" />
          <span>Pengaturan Notifikasi Web (In-App)</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Atur jenis notifikasi di dalam website yang ingin Anda terima di akun Gogomi Store Anda.
        </p>
      </div>

      {/* Essential Notifications Section */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Notifikasi Transaksional Utama (Wajib Aktif)
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Notifikasi penting terkait transaksi, pembayaran QRIS, pengiriman kredensial lisensi, klaim garansi replacement, dan keamanan akun selalu aktif untuk melindungi akun Anda.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="font-bold text-white">Status Pesanan & Pembayaran</span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
              <Check className="h-3 w-3" /> Wajib
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="font-bold text-white">Akses Kredensial Lisensi Digital</span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
              <Check className="h-3 w-3" /> Wajib
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="font-bold text-white">Proses Garansi Replacement</span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
              <Check className="h-3 w-3" /> Wajib
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="font-bold text-white">Alert Keamanan & Login Akun</span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
              <Check className="h-3 w-3" /> Wajib
            </span>
          </div>
        </div>
      </div>

      {/* Optional Notifications Toggles */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Notifikasi Opsional (Dapat Disesuaikan)
        </h2>

        <div className="space-y-4 divide-y divide-slate-800/60 text-xs">
          <div className="pt-3 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Pengingat Masa Aktif & Renewal</h3>
              <p className="text-slate-400">Pemberitahuan 7 hari, 3 hari, dan 1 hari sebelum masa aktif lisensi berakhir.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.inAppSubscriptions}
              onChange={() => handleToggle('inAppSubscriptions')}
              className="h-5 w-5 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer"
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Restock Produk Waitlist</h3>
              <p className="text-slate-400">Notifikasi saat stok produk favorit yang Anda tunggu kembali tersedia.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.inAppWaitlist}
              onChange={() => handleToggle('inAppWaitlist')}
              className="h-5 w-5 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer"
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Notifikasi Penurunan Harga (Price Alert)</h3>
              <p className="text-slate-400">Notifikasi otomatis jika produk yang Anda pantau mengalami penurunan harga.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.inAppPriceAlerts}
              onChange={() => handleToggle('inAppPriceAlerts')}
              className="h-5 w-5 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer"
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Update Koin & Loyalty Milestone</h3>
              <p className="text-slate-400">Informasi perolehan Store Coins, koin aktif, dan pencapaian milestone belanja.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.inAppCoins}
              onChange={() => handleToggle('inAppCoins')}
              className="h-5 w-5 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer"
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Program Referral Teman</h3>
              <p className="text-slate-400">Notifikasi saat teman mendaftar dan reward koin referral siap dicairkan.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.inAppReferrals}
              onChange={() => handleToggle('inAppReferrals')}
              className="h-5 w-5 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer"
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-sm">Promo Eksklusif VIP & Penawaran Khusus</h3>
              <p className="text-slate-400">Kupon potongan harga khusus dan promosi tier keanggotaan VIP.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.inAppPromotions}
              onChange={() => handleToggle('inAppPromotions')}
              className="h-5 w-5 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer"
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
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
