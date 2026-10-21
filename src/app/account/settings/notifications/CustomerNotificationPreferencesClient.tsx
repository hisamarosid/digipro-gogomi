'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, Mail, Shield, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function CustomerNotificationPreferencesClient() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [emailOrderUpdates, setEmailOrderUpdates] = useState(true);
  const [emailReplacements, setEmailReplacements] = useState(true);
  const [emailCoins, setEmailCoins] = useState(true);
  const [emailPromotions, setEmailPromotions] = useState(true);
  const [inAppPromotions, setInAppPromotions] = useState(true);
  const [inAppCoins, setInAppCoins] = useState(true);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/account/notifications/preferences');
      const json = await res.json();
      if (json.success && json.data) {
        setEmailOrderUpdates(json.data.emailOrderUpdates);
        setEmailReplacements(json.data.emailReplacements);
        setEmailCoins(json.data.emailCoins);
        setEmailPromotions(json.data.emailPromotions);
        setInAppPromotions(json.data.inAppPromotions);
        setInAppCoins(json.data.inAppCoins);
      }
    } catch {
      toast.error('Gagal memuat pengaturan notifikasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/account/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrderUpdates,
          emailReplacements,
          emailCoins,
          emailPromotions,
          inAppPromotions,
          inAppCoins,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Pengaturan notifikasi berhasil disimpan!');
      } else {
        toast.error('Gagal menyimpan preferensi');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-500 text-xs">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-cyan-400" />
        Memuat preferensi notifikasi...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs max-w-2xl mx-auto py-4">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <Link href="/account/notifications" className="inline-flex items-center gap-1 text-slate-400 hover:text-white mb-2 transition text-[11px]">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Notifikasi
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight">Pengaturan Preferensi Notifikasi</h1>
        <p className="text-slate-400 text-xs mt-1">
          Atur notifikasi mana yang ingin Anda terima melalui email maupun pesan dalam aplikasi (*In-App*).
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Mandatory Safety Notice */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3 text-blue-400 text-xs">
          <Shield className="h-5 w-5 shrink-0" />
          <span>Catatan: Notifikasi keamanan penting, bukti pembayaran, dan pengiriman produk digital akan selalu dikirim demi keamanan akun Anda.</span>
        </div>

        {/* Email Preferences */}
        <div className="p-5 rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 space-y-4">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <Mail className="h-4 w-4 text-cyan-400" />
            <span>Notifikasi Lewat Email</span>
          </h3>

          <div className="space-y-3 divide-y divide-slate-800/60">
            <label className="flex items-center justify-between pt-2 cursor-pointer">
              <div>
                <span className="font-bold text-slate-200 block">Pembaruan Pesanan & Produk</span>
                <span className="text-[11px] text-slate-400">Terima konfirmasi pembayaran dan link kredensial lewat email.</span>
              </div>
              <input
                type="checkbox"
                checked={emailOrderUpdates}
                onChange={(e) => setEmailOrderUpdates(e.target.checked)}
                className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <span className="font-bold text-slate-200 block">Garansi & Auto Replacement</span>
                <span className="text-[11px] text-slate-400">Terima informasi status akun pengganti saat ada klaim garansi.</span>
              </div>
              <input
                type="checkbox"
                checked={emailReplacements}
                onChange={(e) => setEmailReplacements(e.target.checked)}
                className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <span className="font-bold text-slate-200 block">Store Coin & Rewards</span>
                <span className="text-[11px] text-slate-400">Terima informasi bonus Store Coin dari setiap transaksi.</span>
              </div>
              <input
                type="checkbox"
                checked={emailCoins}
                onChange={(e) => setEmailCoins(e.target.checked)}
                className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
            </label>
          </div>
        </div>

        {/* In-App Preferences */}
        <div className="p-5 rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 space-y-4">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-400" />
            <span>Notifikasi Dalam Website (In-App Bell)</span>
          </h3>

          <div className="space-y-3 divide-y divide-slate-800/60">
            <label className="flex items-center justify-between pt-2 cursor-pointer">
              <div>
                <span className="font-bold text-slate-200 block">Notifikasi Store Coin</span>
                <span className="text-[11px] text-slate-400">Tampilkan pesan bell ketika Store Coin bertambah atau akan expired.</span>
              </div>
              <input
                type="checkbox"
                checked={inAppCoins}
                onChange={(e) => setInAppCoins(e.target.checked)}
                className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between pt-3 cursor-pointer">
              <div>
                <span className="font-bold text-slate-200 block">Promosi & Diskon Spesial</span>
                <span className="text-[11px] text-slate-400">Tampilkan info penawaran diskon khusus di dalam website.</span>
              </div>
              <input
                type="checkbox"
                checked={inAppPromotions}
                onChange={(e) => setInAppPromotions(e.target.checked)}
                className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-lg shadow-cyan-600/20 disabled:opacity-50 text-xs"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Preferensi'}
          </button>
        </div>
      </form>
    </div>
  );
}
