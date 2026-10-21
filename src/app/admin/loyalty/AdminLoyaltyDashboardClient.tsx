'use client';

import React, { useState } from 'react';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import { Pagination } from '@/components/ui/Pagination';
import {
  Coins,
  Settings,
  History,
  TrendingUp,
  Award,
  AlertTriangle,
  Search,
  PlusCircle,
  MinusCircle,
  Save,
  CheckCircle2,
  X,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminLoyaltyDashboardClientProps {
  initialSettings: any;
  initialTiers?: any[];
  customers?: Array<{ id: string; name: string | null; email: string }>;
  featureFlags?: Record<string, boolean>;
  metrics: {
    totalIssuedCoins: number;
    pendingCoins: number;
    availableCoins: number;
    reservedCoins: number;
    redeemedCoins: number;
    redeemedCurrencyValue: number;
    expiredCoins: number;
  };
  initialTransactions: any[];
}

export function AdminLoyaltyDashboardClient({
  initialSettings,
  initialTiers = [],
  customers = [],
  featureFlags = {},
  metrics,
  initialTransactions,
}: AdminLoyaltyDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'SETTINGS' | 'TIERS' | 'TRANSACTIONS'>('DASHBOARD');
  const [settings, setSettings] = useState<any>(initialSettings);
  const [tiers, setTiers] = useState<any[]>(initialTiers);
  const [transactions, setTransactions] = useState<any[]>(initialTransactions);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [savingTierId, setSavingTierId] = useState<string | null>(null);

  // Search & Filters for Transactions
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Manual Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [adjustAmount, setAdjustAmount] = useState<number | ''>('');
  const [adjustType, setAdjustType] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  const filteredCustomers = customers.filter(
    (c) =>
      c.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.id.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/admin/loyalty/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Pengaturan Loyalty Coin berhasil diperbarui!');
        setSettings(json.data);
      } else {
        toast.error(json.error || 'Gagal menyimpan pengaturan');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleManualAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !adjustAmount || !adjustReason) {
      toast.error('Semua kolom penyesuaian wajib diisi!');
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      const res = await fetch(`/api/admin/loyalty/customers/${targetUserId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCoins: Number(adjustAmount),
          type: adjustType,
          reason: adjustReason,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message);
        setShowAdjustModal(false);
        setTargetUserId('');
        setAdjustAmount('');
        setAdjustReason('');
        window.location.reload();
      } else {
        toast.error(json.error || 'Gagal melakukan penyesuaian coin');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      (t.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.orderId || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSaveTier = async (tierId: string, updatedData: any) => {
    setSavingTierId(tierId);
    try {
      const res = await fetch(`/api/admin/loyalty/tiers/${tierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Level Tier ${json.data.name} berhasil diperbarui!`);
        setTiers((prev) => prev.map((t) => (t.id === tierId ? json.data : t)));
        setEditingTierId(null);
      } else {
        toast.error(json.error || 'Gagal menyimpan tier');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setSavingTierId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Feature Flag Warning Banner if MODULE OFF */}
      {featureFlags.STORE_COINS === false && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>
              <strong>Perhatian:</strong> Fitur <em>Store Coin</em> saat ini dinonaktifkan di Feature Management Admin. Halaman customer &amp; checkout tidak akan menampilkan fitur koin.
            </span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Coins className="h-3.5 w-3.5" />
              <span>Customer Loyalty &amp; Gamification</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Loyalty Coins &amp; Reward System
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Kelola konfigurasi cashback coin reward, suku bunga penukaran checkout, level tiers pelanggan, dan audit ledger coin.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAdjustModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Manual Coin Adjustment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation Controls */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-px overflow-x-auto">
        {[
          { id: 'DASHBOARD', label: 'Ringkasan Metrik', icon: Coins },
          { id: 'SETTINGS', label: 'Aturan & Konfigurasi', icon: Settings },
          { id: 'TIERS', label: `Level Tiers (${tiers.length})`, icon: Award },
          { id: 'TRANSACTIONS', label: 'Ledger Transaksi', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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

      {/* TAB 1: METRICS DASHBOARD */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Coins Diterbitkan</span>
              <span className="text-2xl font-black text-white font-mono">{metrics.totalIssuedCoins.toLocaleString()}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-cyan-400 uppercase font-bold block">Pending Coins (7 Hari)</span>
              <span className="text-2xl font-black text-cyan-400 font-mono">{metrics.pendingCoins.toLocaleString()}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Coins Aktif Tersedia</span>
              <span className="text-2xl font-black text-amber-400 font-mono">{metrics.availableCoins.toLocaleString()}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">Nominal Ter-Redeem (Rp)</span>
              <span className="text-xl font-black text-emerald-400 font-mono">{formatIDR(metrics.redeemedCurrencyValue)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Coins Ter-Redeem</span>
              <span className="text-xl font-bold text-white font-mono">{metrics.redeemedCoins.toLocaleString()} Coins</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-rose-400 uppercase font-bold block">Expired / Kadaluarsa</span>
              <span className="text-xl font-bold text-rose-400 font-mono">{metrics.expiredCoins.toLocaleString()} Coins</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Aksi Manual Admin</span>
                <span className="text-xs text-white font-bold">Kredit / Deduksi Coin Pelanggan</span>
              </div>
              <button
                onClick={() => setShowAdjustModal(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition"
              >
                + Adjust Coin
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: RULES & CONFIGURATION */}
      {activeTab === 'SETTINGS' && (
        <form onSubmit={handleSaveSettings} className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white">Centralized Loyalty Settings</h3>
            <button
              type="submit"
              disabled={isSavingSettings}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-white">Aktifkan Modul Loyalty Coin</span>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Nama Coin Customer-Facing</label>
                <input
                  type="text"
                  value={settings.coinName}
                  onChange={(e) => setSettings({ ...settings, coinName: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Konversi Nilai Rupiah (1 Coin = RpX)</label>
                <input
                  type="number"
                  value={settings.currencyValuePerCoin}
                  onChange={(e) => setSettings({ ...settings, currencyValuePerCoin: Number(e.target.value) })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">Default: 10 (Artinya 100 Coins = Rp1.000)</p>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Default Cashback Reward (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.defaultRewardPercentage}
                  onChange={(e) => setSettings({ ...settings, defaultRewardPercentage: Number(e.target.value) })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">Reward dihitung dari net cash eligible payment.</p>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Masa Penundaan Pending (Hari)</label>
                <input
                  type="number"
                  value={settings.pendingPeriodDays}
                  onChange={(e) => setSettings({ ...settings, pendingPeriodDays: Number(e.target.value) })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Masa Kadaluarsa Coin Batch (Hari)</label>
                <input
                  type="number"
                  value={settings.expirationDays}
                  onChange={(e) => setSettings({ ...settings, expirationDays: Number(e.target.value) })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Minimal Penukaran Coin (Minimum Redemption)</label>
                <input
                  type="number"
                  value={settings.minimumRedemptionCoins}
                  onChange={(e) => setSettings({ ...settings, minimumRedemptionCoins: Number(e.target.value) })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Maksimal Diskon Coin (% dari Eligible Total)</label>
                <input
                  type="number"
                  value={settings.maximumRedemptionPercentage}
                  onChange={(e) => setSettings({ ...settings, maximumRedemptionPercentage: Number(e.target.value) })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-white">Izinkan Gabung Kupon + Coin</span>
                <input
                  type="checkbox"
                  checked={settings.allowCouponWithCoins}
                  onChange={(e) => setSettings({ ...settings, allowCouponWithCoins: e.target.checked })}
                  className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-white">Izinkan 100% Pembayaran Coin Secara Global</span>
                <input
                  type="checkbox"
                  checked={settings.allowFullCoinPaymentGlobally}
                  onChange={(e) => setSettings({ ...settings, allowFullCoinPaymentGlobally: e.target.checked })}
                  className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

          </div>
        </form>
      )}

      {/* TAB 3: LOYALTY TIERS MANAGEMENT */}
      {activeTab === 'TIERS' && (
        <div className="space-y-4">
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-cyan-400" />
                  <span>Daftar Level Keanggotaan Pelanggan (Loyalty Tiers)</span>
                </h3>
                <p className="text-xs text-slate-400">Atur multiplier reward coin, batas max koin, dan diskon perpanjangan.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {tiers.map((t) => (
                <div key={t.id} className="rounded-2xl bg-slate-950 border border-slate-800 p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-cyan-400 font-mono font-bold">Rank #{t.rank}</span>
                      <h4 className="text-lg font-black text-white">{t.name}</h4>
                      <p className="text-slate-400 text-[11px]">{t.description}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">
                      {t.badgeLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Minimum Spend (Rp)</label>
                      <input
                        type="number"
                        value={t.minimumSpend}
                        onChange={(e) => setTiers(tiers.map((tier) => (tier.id === t.id ? { ...tier, minimumSpend: Number(e.target.value) } : tier)))}
                        className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Coin Multiplier (x)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={t.coinRewardMultiplier}
                        onChange={(e) => setTiers(tiers.map((tier) => (tier.id === t.id ? { ...tier, coinRewardMultiplier: Number(e.target.value) } : tier)))}
                        className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2 text-cyan-400 font-mono text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Diskon Perpanjangan (%)</label>
                      <input
                        type="number"
                        value={t.renewalDiscountPercentage || 0}
                        onChange={(e) => setTiers(tiers.map((tier) => (tier.id === t.id ? { ...tier, renewalDiscountPercentage: Number(e.target.value) } : tier)))}
                        className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2 text-purple-400 font-mono text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Batas Max Koin (%)</label>
                      <input
                        type="number"
                        value={t.maxCoinRedemptionPercentageOverride || 100}
                        onChange={(e) => setTiers(tiers.map((tier) => (tier.id === t.id ? { ...tier, maxCoinRedemptionPercentageOverride: Number(e.target.value) } : tier)))}
                        className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2 text-emerald-400 font-mono text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex justify-end">
                    <button
                      type="button"
                      disabled={savingTierId === t.id}
                      onClick={() => handleSaveTier(t.id, t)}
                      className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{savingTierId === t.id ? 'Menyimpan...' : 'Simpan Tier'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LEDGER TRANSACTIONS TABLE */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Cari email, nama, deskripsi, atau ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Jenis Transaksi</option>
              <option value="EARN">EARN (Reward)</option>
              <option value="REDEEM">REDEEM (Terpakai)</option>
              <option value="RESERVE">RESERVE (Locked Checkout)</option>
              <option value="RELEASE">RELEASE (Restored)</option>
              <option value="REFUND_RETURN">REFUND_RETURN</option>
              <option value="BONUS">BONUS / ADJUSTMENT</option>
              <option value="EXPIRE">EXPIRE (Kedaluwarsa)</option>
              <option value="REVERSAL">REVERSAL</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-3">Pelanggan</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Jumlah Coin</th>
                  <th className="py-3 px-3">Saldo Setelahnya</th>
                  <th className="py-3 px-3">Deskripsi Transaksi</th>
                  <th className="py-3 px-3">Tanggal &amp; Expire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedTransactions.map((tx) => {
                  const isPos = tx.amountCoins > 0;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-3">
                        <p className="font-bold text-white">{tx.user?.name || 'Pelanggan'}</p>
                        <p className="text-[10px] text-cyan-400 font-mono">{tx.user?.email}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[9px] font-extrabold text-amber-400 border border-slate-700">
                          {tx.type}
                        </span>
                      </td>
                      <td className={`py-3 px-3 font-mono font-black ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPos ? `+${tx.amountCoins}` : tx.amountCoins}
                      </td>
                      <td className="py-3 px-3 font-mono text-white font-bold">{tx.balanceAfter}</td>
                      <td className="py-3 px-3 text-slate-300">{tx.description}</td>
                      <td className="py-3 px-3 text-[11px] text-slate-400 font-mono">
                        {formatDateJakarta(tx.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredTransactions.length / itemsPerPage)}
            totalItems={filteredTransactions.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* MANUAL COIN ADJUSTMENT MODAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <form onSubmit={handleManualAdjustment} className="w-full max-w-md rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Penyesuaian Manual Coin Pelanggan</h3>
              <button type="button" onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Pilih Pelanggan *</label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Cari email / nama pelanggan..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-white text-xs placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />

                  <select
                    required
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono focus:border-amber-500 focus:outline-none text-xs"
                  >
                    <option value="">-- Pilih Pelanggan Target --</option>
                    {filteredCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || 'No Name'} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Aksi Penyesuaian</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-bold focus:border-amber-500 focus:outline-none"
                  >
                    <option value="ADD">ADD (+ Tambah)</option>
                    <option value="DEDUCT">DEDUCT (- Potong)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Jumlah Coin *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 500"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(Number(e.target.value) || '')}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Alasan Wajib (Reason for Audit Log) *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Kompensasi layanan pelanggan atas keterlambatan pengiriman..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingAdjust}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md"
              >
                Eksekusi Penyesuaian
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
