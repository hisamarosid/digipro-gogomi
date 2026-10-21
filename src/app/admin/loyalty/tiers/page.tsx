'use client';

import React, { useEffect, useState } from 'react';
import { Award, ShieldCheck, Sparkles, TrendingUp, Users, RefreshCw, Zap, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/Pagination';

export default function AdminLoyaltyTiersPage() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Table pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchTiers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/loyalty/tiers');
      const json = await res.json();
      if (res.ok && json.success) {
        setTiers(json.data || []);
      }
    } catch {
      toast.error('Gagal memuat konfigurasi tier');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  const totalTiers = tiers.length;
  const maxMultiplier = Math.max(...tiers.map((t) => t.coinRewardMultiplier || 1), 1);

  // Pagination calculation
  const totalItems = tiers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedTiers = tiers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 max-w-7xl mx-auto space-y-4">
        <div className="animate-spin h-9 w-9 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto" />
        <p className="text-xs font-semibold text-slate-300">Memuat Konfigurasi Level Loyalty Tiers...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto text-xs">
      
      {/* Header Banner Box Card (Exact match with Inventory screenshot header box) */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-extrabold uppercase tracking-wider">
              <Award className="h-3.5 w-3.5" />
              <span>LOYALTY &amp; REWARDS TIERS</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Level Keanggotaan (Loyalty Tiers)
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Konfigurasi hirarki tier, syarat belanja minimum, pengganda koin cashback, serta benefit diskon perpanjangan untuk setiap rank.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchTiers}
              className="px-4 py-2.5 rounded-full border border-slate-800 bg-[#0e131f] hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center gap-2 transition"
            >
              <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row (Matches Inventory metric cards style) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800/80 bg-[#0c1019] p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Level Tier</p>
          <p className="text-2xl font-black text-white">{totalTiers} <span className="text-xs text-slate-500 font-normal">Level</span></p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-[#161208] p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Multiplier Maksimal</p>
          <p className="text-2xl font-black text-amber-400">{maxMultiplier}x <span className="text-xs text-amber-500 font-normal">Koin</span></p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-[#081711] p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Status Evaluasi</p>
          <p className="text-2xl font-black text-emerald-400">Real-Time</p>
        </div>
      </div>

      {/* Tier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="group relative rounded-3xl border border-slate-800/80 bg-[#0c1019] p-6 space-y-5 shadow-2xl hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-[#070a10] border border-slate-800 text-cyan-400 font-extrabold text-[10px]">
                  RANK #{tier.rank}
                </span>
                <span className="px-3 py-0.5 rounded-full bg-[#061d2a] border border-[#06b6d4]/30 text-[#06b6d4] font-extrabold text-[10px] flex items-center gap-1.5">
                  <Star className="h-3 w-3 text-cyan-400 fill-cyan-400" />
                  <span>{tier.badgeLabel || tier.name}</span>
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white group-hover:text-cyan-300 transition-colors">{tier.name}</h3>
                <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">{tier.description || 'Tidak ada deskripsi tier.'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-800/80">
              <div className="p-3 rounded-2xl bg-[#070a10] border border-slate-800/60 space-y-0.5">
                <span className="text-slate-500 text-[10px] block font-semibold">Min. Belanja</span>
                <p className="font-bold text-white text-xs">Rp{(tier.minimumSpend || 0).toLocaleString('id-ID')}</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#070a10] border border-slate-800/60 space-y-0.5">
                <span className="text-slate-500 text-[10px] block font-semibold">Multiplier</span>
                <p className="font-bold text-amber-400 text-xs">{tier.coinRewardMultiplier || 1}x Koin</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#070a10] border border-slate-800/60 space-y-0.5">
                <span className="text-slate-500 text-[10px] block font-semibold">Diskon Perpanjang</span>
                <p className="font-bold text-purple-400 text-xs">{tier.renewalDiscountPercentage || 0}% Off</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#070a10] border border-slate-800/60 space-y-0.5">
                <span className="text-slate-500 text-[10px] block font-semibold">Batas Koin Max</span>
                <p className="font-bold text-emerald-400 text-xs">{tier.maxCoinRedemptionPercentageOverride || 30}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Panel (Matches Inventory main table container style) */}
      <div className="rounded-3xl border border-slate-800/80 bg-[#0c1019] p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" />
            <span>Tabel Ringkasan Syarat Tier</span>
          </h2>
          <span className="text-slate-400 text-[11px] font-medium">Total {tiers.length} Tier Terdaftar</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#080b11] border-b border-slate-800/80 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-4">Rank</th>
                <th className="py-3.5 px-4">Nama Tier</th>
                <th className="py-3.5 px-4">Badge Label</th>
                <th className="py-3.5 px-4">Minimum Spend</th>
                <th className="py-3.5 px-4">Coin Multiplier</th>
                <th className="py-3.5 px-4">Diskon Perpanjangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300 font-mono text-xs">
              {paginatedTiers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-900/30 transition">
                  <td className="py-3.5 px-4 font-bold text-cyan-400">#{t.rank}</td>
                  <td className="py-3.5 px-4 font-sans font-bold text-white">{t.name}</td>
                  <td className="py-3.5 px-4 font-sans">
                    <span className="rounded-full bg-[#061d2a] text-[#06b6d4] border border-[#06b6d4]/30 px-3 py-0.5 text-[10px] font-extrabold tracking-wide">
                      {t.badgeLabel || '-'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-white">
                    Rp{(t.minimumSpend || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-amber-400">{t.coinRewardMultiplier || 1}x</td>
                  <td className="py-3.5 px-4 font-semibold text-purple-300">
                    {t.renewalDiscountPercentage || 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Shared Pagination Component */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={(page) => setCurrentPage(page)}
          onItemsPerPageChange={(limit) => {
            setItemsPerPage(limit);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
}
