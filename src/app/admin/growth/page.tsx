'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Users, Award, Heart, Bell, DollarSign, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminGrowthPage() {
  const [growthData, setGrowthData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/admin/growth/reports');
        const json = await res.json();
        if (res.ok && json.success) {
          setGrowthData(json.data);
        }
      } catch (err) {
        toast.error('Gagal memuat laporan pertumbuhan pelanggan');
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="animate-spin h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4" />
        Memuat Laporan Pertumbuhan & Konversi...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <TrendingUp className="h-7 w-7 text-cyan-400" />
            <span>Dashboard Growth & Konversi Pelanggan</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Analisis retensi, tingkat pembelian berulang (repeat purchase), dan distribusi Loyalty Tier.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/loyalty/tiers"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-1.5"
          >
            <Award className="h-4 w-4 text-cyan-400" />
            <span>Kelola Loyalty Tier</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span>Repeat Purchase Rate</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="text-3xl font-black text-white">{growthData?.repeatPurchaseRate || 0}%</p>
          <p className="text-[10px] text-slate-500">
            {growthData?.repeatCustomers || 0} dari {growthData?.buyersCount || 0} pembeli melakukan &gt;1 pesanan.
          </p>
        </div>

        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span>Wishlist Conversion Rate</span>
            <Heart className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-3xl font-black text-rose-400">{growthData?.wishlistConversionRate || 0}%</p>
          <p className="text-[10px] text-slate-500">
            Total {growthData?.totalWishlistItems || 0} item disimpan oleh pelanggan.
          </p>
        </div>

        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span>Customer Lifetime Value (CLV Proxy)</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">
            Rp{(growthData?.averageCLV || 0).toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-slate-500">Rata-rata pendapatan bersih per pembeli aktif.</p>
        </div>

        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span>Active Price Watches</span>
            <Bell className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-amber-400">{growthData?.totalPriceWatches || 0}</p>
          <p className="text-[10px] text-slate-500">Pelanggan memantau penurunan harga.</p>
        </div>
      </div>

      {/* Loyalty Tier Distribution Card */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Award className="h-5 w-5 text-cyan-400" />
          <span>Distribusi Loyalty Tier Pelanggan</span>
        </h2>

        {growthData?.tierDistribution ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {Object.entries(growthData.tierDistribution).map(([tierName, count]: [string, any]) => (
              <div key={tierName} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[11px] font-bold">{tierName}</span>
                <p className="text-2xl font-extrabold text-white">{count} Member</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Belum ada data distribusi tier.</p>
        )}
      </div>
    </div>
  );
}
