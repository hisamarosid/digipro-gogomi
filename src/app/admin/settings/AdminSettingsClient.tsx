'use client';

import React, { useState } from 'react';
import {
  Settings,
  Save,
  ShieldCheck,
  Key,
  Store,
  CreditCard,
  MessageCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  Globe,
  Palette,
  FileText,
  Sliders,
  Sparkles,
  Search,
  Bell,
  Eye,
  Activity,
  DollarSign,
  Layers,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { SiteSettingsData } from '@/services/siteSetting.service';

interface AdminSettingsClientProps {
  initialSettings: SiteSettingsData;
}

type SettingsTab = 'brand' | 'seo' | 'contact' | 'payment' | 'telegram' | 'system';

export function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
  const [form, setForm] = useState<SiteSettingsData>(initialSettings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('brand');
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const handleChange = (key: keyof SiteSettingsData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggle = (key: keyof SiteSettingsData) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key] === 'true' ? 'false' : 'true',
    }));
  };

  const handleFileUpload = async (key: keyof SiteSettingsData, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingKey(key);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.success) {
        handleChange(key, json.url);
        toast.success(`Gambar untuk ${key} berhasil diunggah!`);
      } else {
        toast.error(json.error || 'Gagal mengunggah gambar');
      }
    } catch {
      toast.error('Terjadi kesalahan saat mengunggah gambar');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSendTestTelegram = async () => {
    setIsTestingTelegram(true);
    try {
      const res = await fetch('/api/admin/settings/telegram/test', {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Pesan test Telegram berhasil dikirim ke Admin Chat ID!');
      } else {
        toast.error(json.error || 'Gagal mengirim test Telegram');
      }
    } catch {
      toast.error('Gagal menghubungi server');
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Pengaturan website dan toko berhasil diperbarui!');
        setForm(json.data);
      } else {
        toast.error(json.error || 'Gagal menyimpan pengaturan toko');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi jaringan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Sliders className="h-3.5 w-3.5" />
              <span>General Store &amp; Website Configuration</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Pengaturan Toko &amp; Integrasi Website
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Atur identitas brand toko, metadata SEO, logo &amp; icon, kanal layanan pelanggan, payment gateway QRIS, serta notifikasi Telegram admin.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition shrink-0"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Simpan Semua Pengaturan</span>
          </button>
        </div>
      </div>

      {/* Quick Status Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Brand Toko</p>
          <p className="text-xl font-black text-white truncate">{form.STORE_NAME || 'Gogomi Store'}</p>
          <span className="text-[10px] text-emerald-400 font-bold">● Brand Aktif</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">SEO &amp; Indexing</p>
          <p className="text-xl font-black text-cyan-300 truncate">{form.SEO_TITLE ? 'Teroptimasi' : 'Default'}</p>
          <span className="text-[10px] text-cyan-400 font-bold">● Meta Tags Ready</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gateway AutoGoPay</p>
          <p className="text-xl font-black text-emerald-400 font-mono truncate">{form.AUTOGOPAY_MERCHANT_ID || 'AGP-DEMO'}</p>
          <span className="text-[10px] text-emerald-400 font-bold">● QRIS Otomatis ({form.QRIS_EXPIRY_MINUTES || 15}m)</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Telegram Admin Bot</p>
          <p className={`text-xl font-black ${form.TELEGRAM_ENABLED !== 'false' ? 'text-cyan-400' : 'text-slate-500'}`}>
            {form.TELEGRAM_ENABLED !== 'false' ? 'Aktif' : 'Nonaktif'}
          </p>
          <span className="text-[10px] text-cyan-400 font-bold">
            {form.TELEGRAM_ADMIN_CHAT_ID ? `● Chat ${form.TELEGRAM_ADMIN_CHAT_ID}` : '● Belum Dikonfigurasi'}
          </span>
        </div>
      </div>

      {/* Main Form Container */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-px overflow-x-auto">
          {[
            { id: 'brand', label: 'Identitas & Logo', icon: Store },
            { id: 'seo', label: 'SEO & Metadata', icon: Globe },
            { id: 'contact', label: 'Kontak & CS', icon: MessageCircle },
            { id: 'payment', label: 'Payment Gateway', icon: CreditCard },
            { id: 'telegram', label: 'Telegram Bot & Alerts', icon: Send },
            { id: 'system', label: 'Sistem & Kebijakan', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl font-bold text-xs transition border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: BRANDING & LOGO */}
        {activeTab === 'brand' && (
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Store className="h-4 w-4 text-cyan-400" />
                <span>Identitas Toko &amp; Visual Branding</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Atur nama toko, slogan, logo website, favicon browser, dan warna tema utama.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">Nama Toko Digital *</label>
                <input
                  type="text"
                  required
                  value={form.STORE_NAME || ''}
                  onChange={(e) => handleChange('STORE_NAME', e.target.value)}
                  placeholder="Gogomi Store"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">Tagline / Slogan Brand</label>
                <input
                  type="text"
                  value={form.STORE_TAGLINE || ''}
                  onChange={(e) => handleChange('STORE_TAGLINE', e.target.value)}
                  placeholder="Toko Produk Digital Legal, Murah & Bergaransi"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Logo Website Uploader */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold text-xs block">Logo Utama Website (Horizontal)</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] cursor-pointer transition shadow">
                    {uploadingKey === 'STORE_LOGO_URL' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span>Unggah File</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingKey === 'STORE_LOGO_URL'}
                      onChange={(e) => handleFileUpload('STORE_LOGO_URL', e)}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={form.STORE_LOGO_URL || ''}
                  onChange={(e) => handleChange('STORE_LOGO_URL', e.target.value)}
                  placeholder="https://gogomi.store/logo.png atau /gogomi-logo.png"
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                {form.STORE_LOGO_URL && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[10px] text-slate-400">Pratinjau:</span>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 inline-block">
                      <img
                        src={form.STORE_LOGO_URL}
                        alt="Preview Logo"
                        className="h-7 w-auto object-contain"
                        onError={(e) => ((e.target as any).style.display = 'none')}
                      />
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-slate-500">Format PNG transparan atau SVG rasio horizontal untuk Header.</p>
              </div>

              {/* Icon Toko / Square Avatar Uploader */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold text-xs block">Ikon Toko / Avatar Kotak (App Icon)</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] cursor-pointer transition shadow">
                    {uploadingKey === 'STORE_ICON_URL' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span>Unggah File</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingKey === 'STORE_ICON_URL'}
                      onChange={(e) => handleFileUpload('STORE_ICON_URL', e)}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={form.STORE_ICON_URL || ''}
                  onChange={(e) => handleChange('STORE_ICON_URL', e.target.value)}
                  placeholder="https://gogomi.store/icon.png atau /icon.png"
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                {form.STORE_ICON_URL && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[10px] text-slate-400">Pratinjau:</span>
                    <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 inline-block">
                      <img
                        src={form.STORE_ICON_URL}
                        alt="Preview Icon"
                        className="h-8 w-8 rounded-lg object-contain"
                        onError={(e) => ((e.target as any).style.display = 'none')}
                      />
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-slate-500">Ikon rasio 1:1 (PNG/WebP 512x512) untuk PWA, Apple Touch, dan avatar.</p>
              </div>

              {/* Favicon Uploader */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold text-xs block">Favicon Browser (.ico / .png)</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] cursor-pointer transition shadow">
                    {uploadingKey === 'STORE_FAVICON_URL' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span>Unggah File</span>
                    <input
                      type="file"
                      accept=".ico,.png,.svg,image/*"
                      className="hidden"
                      disabled={uploadingKey === 'STORE_FAVICON_URL'}
                      onChange={(e) => handleFileUpload('STORE_FAVICON_URL', e)}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={form.STORE_FAVICON_URL || ''}
                  onChange={(e) => handleChange('STORE_FAVICON_URL', e.target.value)}
                  placeholder="https://gogomi.store/favicon.ico atau /favicon.ico"
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                {form.STORE_FAVICON_URL && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[10px] text-slate-400">Pratinjau:</span>
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 inline-block">
                      <img
                        src={form.STORE_FAVICON_URL}
                        alt="Preview Favicon"
                        className="h-5 w-5 object-contain"
                        onError={(e) => ((e.target as any).style.display = 'none')}
                      />
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-slate-500">Ikon tab browser (format .ico atau .png 32x32px / 64x64px).</p>
              </div>

              {/* Warna Aksen Tema */}
              <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <label className="text-slate-300 font-bold text-xs block">Warna Aksen Tema</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.STORE_THEME_COLOR || '#06b6d4'}
                    onChange={(e) => handleChange('STORE_THEME_COLOR', e.target.value)}
                    className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.STORE_THEME_COLOR || '#06b6d4'}
                    onChange={(e) => handleChange('STORE_THEME_COLOR', e.target.value)}
                    className="w-32 rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Announcement Bar Settings */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-amber-400" />
                    <span>Banner Pengumuman Header (Announcement Bar)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">Tampilkan baris promo / pemberitahuan penting di bagian paling atas website.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('ANNOUNCEMENT_ACTIVE')}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    form.ANNOUNCEMENT_ACTIVE === 'true' ? 'bg-cyan-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    form.ANNOUNCEMENT_ACTIVE === 'true' ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {form.ANNOUNCEMENT_ACTIVE === 'true' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-bold text-xs block">Teks Pengumuman</label>
                    <input
                      type="text"
                      value={form.ANNOUNCEMENT_TEXT || ''}
                      onChange={(e) => handleChange('ANNOUNCEMENT_TEXT', e.target.value)}
                      placeholder="⚡ Promo Merdeka: Diskon 15% untuk semua akun!"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-bold text-xs block">Link Tujuan (Opsional)</label>
                    <input
                      type="text"
                      value={form.ANNOUNCEMENT_LINK || ''}
                      onChange={(e) => handleChange('ANNOUNCEMENT_LINK', e.target.value)}
                      placeholder="/products atau /promo"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SEO & METADATA */}
        {activeTab === 'seo' && (
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Globe className="h-4 w-4 text-cyan-400" />
                <span>Optimasi Mesin Pencari (Search Engine Optimization - SEO)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Kelola meta title, deskripsi, OpenGraph social card saat link dibagikan di WA/Twitter, dan tracking Google Analytics.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">Default Meta Title *</label>
                <input
                  type="text"
                  required
                  value={form.SEO_TITLE || ''}
                  onChange={(e) => handleChange('SEO_TITLE', e.target.value)}
                  placeholder="Gogomi Store — Toko Produk Digital Legal & Terpercaya"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[10px] text-slate-500">Judul utama halaman web di hasil pencarian Google.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">Meta Description</label>
                <textarea
                  rows={3}
                  value={form.SEO_DESCRIPTION || ''}
                  onChange={(e) => handleChange('SEO_DESCRIPTION', e.target.value)}
                  placeholder="Beli akun AI, lisensi software, aplikasi produktivitas, dan aset digital legal dengan pembayaran QRIS otomatis dan garansi terjamin."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[10px] text-slate-500">Deskripsi ringkas (150-160 karakter disarankan untuk SEO terbaik).</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold text-xs block">Keywords (Kata Kunci)</label>
                  <input
                    type="text"
                    value={form.SEO_KEYWORDS || ''}
                    onChange={(e) => handleChange('SEO_KEYWORDS', e.target.value)}
                    placeholder="produk digital, akun canva, chatgpt plus, netflix murah"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold text-xs block">Canonical Store URL</label>
                  <input
                    type="text"
                    value={form.SEO_CANONICAL_URL || ''}
                    onChange={(e) => handleChange('SEO_CANONICAL_URL', e.target.value)}
                    placeholder="https://gogomi.store"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* OG Social Image Uploader */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold text-xs block">OpenGraph Social Share Image (1200x630px)</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] cursor-pointer transition shadow">
                    {uploadingKey === 'SEO_OG_IMAGE' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span>Unggah File</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingKey === 'SEO_OG_IMAGE'}
                      onChange={(e) => handleFileUpload('SEO_OG_IMAGE', e)}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={form.SEO_OG_IMAGE || ''}
                  onChange={(e) => handleChange('SEO_OG_IMAGE', e.target.value)}
                  placeholder="https://gogomi.store/og-banner.jpg atau /og-image.png"
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                {form.SEO_OG_IMAGE && (
                  <div className="pt-2">
                    <img
                      src={form.SEO_OG_IMAGE}
                      alt="Preview OG Banner"
                      className="h-28 w-auto rounded-xl object-cover border border-slate-800"
                      onError={(e) => ((e.target as any).style.display = 'none')}
                    />
                  </div>
                )}
                <p className="text-[10px] text-slate-500">Gambar pratinjau (1200x630px) saat link toko dibagikan di WhatsApp, Telegram, FB, dan Twitter.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold text-xs block">Google Search Console Tag</label>
                  <input
                    type="text"
                    value={form.GSC_VERIFICATION_CODE || ''}
                    onChange={(e) => handleChange('GSC_VERIFICATION_CODE', e.target.value)}
                    placeholder="google-site-verification=xxxx..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold text-xs block">Google Analytics ID</label>
                  <input
                    type="text"
                    value={form.GOOGLE_ANALYTICS_ID || ''}
                    onChange={(e) => handleChange('GOOGLE_ANALYTICS_ID', e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold text-xs block">Meta Pixel ID</label>
                  <input
                    type="text"
                    value={form.FACEBOOK_PIXEL_ID || ''}
                    onChange={(e) => handleChange('FACEBOOK_PIXEL_ID', e.target.value)}
                    placeholder="123456789012345"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONTACT & CUSTOMER SUPPORT */}
        {activeTab === 'contact' && (
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                <span>Kontak Layanan Pelanggan &amp; Customer Support</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Informasi nomor WhatsApp, channel Telegram, email bantuan, dan jam kerja operasional CS.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">Nomor WhatsApp Resmi CS</label>
                <input
                  type="text"
                  value={form.SUPPORT_WHATSAPP || ''}
                  onChange={(e) => handleChange('SUPPORT_WHATSAPP', e.target.value)}
                  placeholder="+6281234567890"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">Username / Link Telegram CS</label>
                <input
                  type="text"
                  value={form.SUPPORT_TELEGRAM || ''}
                  onChange={(e) => handleChange('SUPPORT_TELEGRAM', e.target.value)}
                  placeholder="@gogomistore_cs"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">Email Dukungan Pelanggan</label>
                <input
                  type="email"
                  value={form.SUPPORT_EMAIL || ''}
                  onChange={(e) => handleChange('SUPPORT_EMAIL', e.target.value)}
                  placeholder="cs@gogomi.store"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">Jam Operasional Layanan</label>
                <input
                  type="text"
                  value={form.SUPPORT_HOURS || ''}
                  onChange={(e) => handleChange('SUPPORT_HOURS', e.target.value)}
                  placeholder="Setiap Hari: 08:00 - 23:00 WIB"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">Alamat / Lokasi Operasional</label>
                <input
                  type="text"
                  value={form.STORE_ADDRESS || ''}
                  onChange={(e) => handleChange('STORE_ADDRESS', e.target.value)}
                  placeholder="Jakarta, Indonesia"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PAYMENT GATEWAY */}
        {activeTab === 'payment' && (
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-cyan-400" />
                <span>Konfigurasi Payment Gateway (AutoGoPay QRIS Real-Time)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Kredensial API pembayaran otomatis QRIS untuk verifikasi pembayaran pesanan instan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">Merchant ID AutoGoPay</label>
                <input
                  type="text"
                  value={form.AUTOGOPAY_MERCHANT_ID || ''}
                  onChange={(e) => handleChange('AUTOGOPAY_MERCHANT_ID', e.target.value)}
                  placeholder="AGP-XXXXXXXX"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">Masa Berlaku Tagihan QRIS (Menit)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={form.QRIS_EXPIRY_MINUTES || '15'}
                  onChange={(e) => handleChange('QRIS_EXPIRY_MINUTES', e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">API Key AutoGoPay</label>
                <input
                  type="password"
                  value={form.AUTOGOPAY_API_KEY || ''}
                  onChange={(e) => handleChange('AUTOGOPAY_API_KEY', e.target.value)}
                  placeholder="agp_live_key_••••••••"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">Secret Key / Webhook Signature</label>
                <input
                  type="password"
                  value={form.AUTOGOPAY_SECRET_KEY || ''}
                  onChange={(e) => handleChange('AUTOGOPAY_SECRET_KEY', e.target.value)}
                  placeholder="agp_secret_••••••••"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <span className="font-bold text-white block">URL Webhook Notifikasi Transaksi (Callback)</span>
                <code className="text-[11px] font-mono text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 block w-fit">
                  {process.env.NEXT_PUBLIC_APP_URL || 'https://gogomi.store'}/api/webhooks/autogopay
                </code>
                <span className="text-[10px] text-slate-400 block">Salin URL ini ke dashboard AutoGoPay Anda untuk auto-settlement instan.</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TELEGRAM BOT & NOTIFICATIONS */}
        {activeTab === 'telegram' && (
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 space-y-6">
            <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Send className="h-4 w-4 text-cyan-400" />
                  <span>Konfigurasi Notifikasi Telegram Admin</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Kirimkan notifikasi realtime untuk order lunas, waiting stock, fulfillment error, dan alert sistem langsung ke channel/grup Telegram admin.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSendTestTelegram}
                disabled={isTestingTelegram}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-bold text-xs shadow transition shrink-0"
              >
                {isTestingTelegram ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Kirim Test Telegram</span>
              </button>
            </div>

            {/* Master Toggle Banner */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Aktifkan Sistem Notifikasi Telegram</span>
                </h4>
                <p className="text-[11px] text-slate-400">Master switch untuk seluruh pengiriman notifikasi Telegram admin.</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('TELEGRAM_ENABLED')}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                  form.TELEGRAM_ENABLED !== 'false' ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  form.TELEGRAM_ENABLED !== 'false' ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Credentials Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Telegram Bot Token</span>
                </label>
                <input
                  type="password"
                  value={form.TELEGRAM_BOT_TOKEN || ''}
                  onChange={(e) => handleChange('TELEGRAM_BOT_TOKEN', e.target.value)}
                  placeholder="123456789:AAxxxxxxxx..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500 block">Dapatkan dari @BotFather di Telegram. Disimpan aman pada environment server.</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Admin Chat ID / Group ID</span>
                </label>
                <input
                  type="text"
                  value={form.TELEGRAM_ADMIN_CHAT_ID || ''}
                  onChange={(e) => handleChange('TELEGRAM_ADMIN_CHAT_ID', e.target.value)}
                  placeholder="5458371268"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500 block">ID chat pribadi admin atau ID supergroup pengelola toko.</span>
              </div>
            </div>

            {/* Per-Event Notification Preferences */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                Preferensi Notifikasi Per-Event
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. ORDER PAID */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-xs">Order Baru Lunas (Order Paid)</p>
                    <p className="text-[10px] text-slate-400">Hanya saat pembayaran QRIS/Coin telah sukses diverifikasi.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('TELEGRAM_NOTIF_ORDER_PAID')}
                    className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                      form.TELEGRAM_NOTIF_ORDER_PAID !== 'false' ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      form.TELEGRAM_NOTIF_ORDER_PAID !== 'false' ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* 2. WAITING STOCK */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-xs">Waiting Stock (Stok Kosong)</p>
                    <p className="text-[10px] text-slate-400">Order lunas masuk antrean karena stok produk habis.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('TELEGRAM_NOTIF_WAITING_STOCK')}
                    className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                      form.TELEGRAM_NOTIF_WAITING_STOCK !== 'false' ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      form.TELEGRAM_NOTIF_WAITING_STOCK !== 'false' ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* 3. FULFILLMENT FAILED */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-xs">Fulfillment Gagal (Job Error)</p>
                    <p className="text-[10px] text-slate-400">Pengiriman otomatis gagal setelah batas maksimal percobaan.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('TELEGRAM_NOTIF_FULFILLMENT_FAILED')}
                    className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                      form.TELEGRAM_NOTIF_FULFILLMENT_FAILED !== 'false' ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      form.TELEGRAM_NOTIF_FULFILLMENT_FAILED !== 'false' ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* 4. REPLACEMENT */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-xs">Klaim Replacement Customer</p>
                    <p className="text-[10px] text-slate-400">Pengajuan klaim garansi akun atau kredensial bermasalah.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('TELEGRAM_NOTIF_REPLACEMENT')}
                    className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                      form.TELEGRAM_NOTIF_REPLACEMENT !== 'false' ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      form.TELEGRAM_NOTIF_REPLACEMENT !== 'false' ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* 5. LOW STOCK & MASTER INVALID */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-xs">Stok Menipis &amp; Master Invalid</p>
                    <p className="text-[10px] text-slate-400">Alert ketika stok di bawah batas kritis atau master rusak.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('TELEGRAM_NOTIF_LOW_STOCK')}
                    className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                      form.TELEGRAM_NOTIF_LOW_STOCK !== 'false' ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      form.TELEGRAM_NOTIF_LOW_STOCK !== 'false' ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* 6. SUPPLIER CLAIM */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-xs">Klaim Garansi Supplier</p>
                    <p className="text-[10px] text-slate-400">Rekomendasi klaim &amp; peringatan deadline supplier.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('TELEGRAM_NOTIF_SUPPLIER_CLAIM')}
                    className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                      form.TELEGRAM_NOTIF_SUPPLIER_CLAIM !== 'false' ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      form.TELEGRAM_NOTIF_SUPPLIER_CLAIM !== 'false' ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* 7. SYSTEM ERRORS */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-xs">System &amp; Gateway Errors</p>
                    <p className="text-[10px] text-slate-400">Payment mismatch, webhook failure, cron, dan email queue.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('TELEGRAM_NOTIF_SYSTEM_ERROR')}
                    className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                      form.TELEGRAM_NOTIF_SYSTEM_ERROR !== 'false' ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      form.TELEGRAM_NOTIF_SYSTEM_ERROR !== 'false' ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* 8. SECURITY ALERTS */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-xs">Security &amp; Admin Audit Alerts</p>
                    <p className="text-[10px] text-slate-400">Aktivitas admin krusial &amp; pelanggaran akses keamanan.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('TELEGRAM_NOTIF_SECURITY')}
                    className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                      form.TELEGRAM_NOTIF_SECURITY !== 'false' ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      form.TELEGRAM_NOTIF_SECURITY !== 'false' ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SYSTEM & POLICIES */}
        {activeTab === 'system' && (
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-cyan-400" />
                <span>Mode Sistem, Garansi &amp; Kebijakan Toko</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Pengaturan masa garansi default, auto replacement, mode pemeliharaan, serta dokumen kebijakan legal.
              </p>
            </div>

            {/* Toggle Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Maintenance Mode */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                    <span>Mode Maintenance (Pemeliharaan)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">Kunci akses toko dari publik saat pemeliharaan server.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('MAINTENANCE_MODE')}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    form.MAINTENANCE_MODE === 'true' ? 'bg-rose-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    form.MAINTENANCE_MODE === 'true' ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Auto Replacement */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Auto-Replacement Otomatis</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">Ganti stok rusak secara otomatis jika garansi valid.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('AUTO_REPLACEMENT_GLOBAL_ENABLE')}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    form.AUTO_REPLACEMENT_GLOBAL_ENABLE === 'true' ? 'bg-cyan-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    form.AUTO_REPLACEMENT_GLOBAL_ENABLE === 'true' ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">Default Masa Garansi Produk (Hari)</label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={form.DEFAULT_WARRANTY_DAYS || '30'}
                  onChange={(e) => handleChange('DEFAULT_WARRANTY_DAYS', e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Policy Documents */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">Syarat &amp; Ketentuan (Terms of Service)</label>
                <textarea
                  rows={3}
                  value={form.TERMS_OF_SERVICE || ''}
                  onChange={(e) => handleChange('TERMS_OF_SERVICE', e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold text-xs block">Kebijakan Garansi &amp; Refund (Refund Policy)</label>
                <textarea
                  rows={3}
                  value={form.REFUND_POLICY || ''}
                  onChange={(e) => handleChange('REFUND_POLICY', e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-xl shadow-cyan-500/20 transition"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Simpan Perubahan Pengaturan</span>
          </button>
        </div>

      </form>

    </div>
  );
}
