'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Users,
  Key,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Activity,
  ArrowUpRight,
  ArrowRight,
  Package,
  Layers,
  Headphones,
  Sparkles,
  RefreshCw,
  Plus,
  Zap,
  BarChart3,
  Calendar,
  Eye,
  CheckCircle,
  HelpCircle,
  KeyRound,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';

export interface OverviewData {
  metrics: {
    revenueAllTime: number;
    revenueToday: number;
    revenueMonth: number;
    totalPaidOrdersCount: number;
    pendingOrdersCount: number;
    ordersTodayCount: number;
    averageOrderValue: number;
    totalCustomersCount: number;
    newCustomersThisMonth: number;
    activeSubsCount: number;
    expiringSoonSubsCount: number;
    pendingReplacementsCount: number;
    openTicketsCount: number;
  };
  chartData: Array<{
    date: string;
    label: string;
    revenue: number;
    orders: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    grandTotal: number;
    status: string;
    paymentStatus: string;
    provider?: string;
    itemsSummary: string;
    itemCount: number;
    createdAt: string;
  }>;
  stockAlerts: Array<{
    id: string;
    name: string;
    productName: string;
    productSlug: string;
    deliveryModel: string;
    price: number;
    stock: number;
    isOutOfStock: boolean;
  }>;
  expiringSubscriptions: Array<{
    id: string;
    customerName: string;
    customerEmail: string;
    productName: string;
    variantName: string;
    expiresAt: string;
    daysRemaining: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    slug: string;
    categoryName: string;
    soldCount: number;
    viewCount: number;
    minPrice: number;
    thumbnail: string | null;
  }>;
  lifecycleAlerts?: {
    sharedSlotsNeedingRotation: number;
    familySlotsNeedingRotation: number;
    totalAccountsAffected: number;
  };
}

interface AdminDashboardOverviewClientProps {
  initialData: OverviewData;
}

export function AdminDashboardOverviewClient({ initialData }: AdminDashboardOverviewClientProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'stocks' | 'expiring' | 'top_products'>('orders');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');

  const {
    metrics,
    chartData,
    recentOrders,
    stockAlerts,
    expiringSubscriptions,
    topProducts,
  } = initialData;

  const lowStockCount = stockAlerts.length;
  const outOfStockCount = stockAlerts.filter((s) => s.isOutOfStock).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Gogomi Store — Admin Overview Center</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Dashboard Ringkasan Operasional
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Pemantauan real-time transaksi, kesehatan inventori stok digital (Shared/Family/Dedicated), pelanggan aktif, dan status layanan toko.
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/admin/inventory"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Key className="h-4 w-4" />
              <span>Kelola Stok Akun</span>
            </Link>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 text-cyan-400" />
              <span>Tambah Produk</span>
            </Link>
            <Link
              href="/admin/reports/profit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-bold text-xs border border-slate-700/60 transition"
            >
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>Laporan Laba</span>
            </Link>
          </div>
        </div>

        {/* System Health Ticker */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-300">Database PostgreSQL:</span>
            <span className="text-emerald-400 font-bold">Terhubung</span>
          </div>
          <div className="hidden sm:block text-slate-700">•</div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-slate-300">Gateway AutoGoPay:</span>
            <span className="text-emerald-400 font-bold">QRIS Online</span>
          </div>
          <div className="hidden sm:block text-slate-700">•</div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="font-semibold text-slate-300">Email SMTP Hostinger:</span>
            <span className="text-cyan-400 font-bold">Aktif & Terverifikasi</span>
          </div>
        </div>
      </div>

      {/* Inventory Lifecycle Alert: Slots needing password rotation */}
      {initialData.lifecycleAlerts && initialData.lifecycleAlerts.totalAccountsAffected > 0 && (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-950/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>Perhatian: Ada {initialData.lifecycleAlerts.totalAccountsAffected} Slot/Member yang Masa Aktif Customernya Telah Selesai</span>
              </h3>
              <p className="text-xs text-slate-300">
                Akun master masih aktif. Silakan lakukan rotasi password master / link undangan baru agar slot dapat segera dirilis kembali ke etalase toko.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {initialData.lifecycleAlerts.sharedSlotsNeedingRotation > 0 && (
              <Link
                href="/admin/inventory/shared"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition flex items-center gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Rilis Stok Shared ({initialData.lifecycleAlerts.sharedSlotsNeedingRotation})</span>
              </Link>
            )}
            {initialData.lifecycleAlerts.familySlotsNeedingRotation > 0 && (
              <Link
                href="/admin/inventory/families"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition flex items-center gap-1.5"
              >
                <Users className="h-3.5 w-3.5 text-cyan-400" />
                <span>Rilis Family ({initialData.lifecycleAlerts.familySlotsNeedingRotation})</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Top Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total Omset Hari Ini */}
        <div className="rounded-3xl glass-panel border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-slate-900/60 p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Omset Hari Ini</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl lg:text-3xl font-black text-white font-mono tracking-tight">
              {formatIDR(metrics.revenueToday)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-bold">{metrics.ordersTodayCount} pesanan</span> dibuat hari ini
            </p>
          </div>
        </div>

        {/* Metric 2: Omset Bulan Ini */}
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Omset Bulan Ini</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl lg:text-3xl font-black text-white font-mono tracking-tight">
              {formatIDR(metrics.revenueMonth)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Total Akumulatif: <span className="text-cyan-400 font-mono font-bold">{formatIDR(metrics.revenueAllTime)}</span>
            </p>
          </div>
        </div>

        {/* Metric 3: Pesanan Berhasil & Pending */}
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Transaksi Pesanan</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl lg:text-3xl font-black text-white font-mono tracking-tight">
                {metrics.totalPaidOrdersCount}
              </p>
              <span className="text-xs font-bold text-emerald-400">Lunas / Selesai</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {metrics.pendingOrdersCount > 0 ? (
                <span className="text-amber-400 font-bold">{metrics.pendingOrdersCount} menunggu pembayaran</span>
              ) : (
                <span className="text-slate-400">Semua pesanan diproses</span>
              )}
            </p>
          </div>
        </div>

        {/* Metric 4: Pelanggan & Layanan Aktif */}
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pelanggan & Layanan</span>
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl lg:text-3xl font-black text-white font-mono tracking-tight">
                {metrics.totalCustomersCount}
              </p>
              <span className="text-xs font-bold text-purple-300">Customer</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              <span className="text-cyan-400 font-bold">{metrics.activeSubsCount} langganan</span> aktif berjalan
            </p>
          </div>
        </div>

      </div>

      {/* Secondary Operational Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rata-rata Order (AOV)</p>
            <p className="text-sm font-black text-white font-mono mt-0.5">{formatIDR(metrics.averageOrderValue)}</p>
          </div>
          <div className="h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
            <BarChart3 className="h-4 w-4" />
          </div>
        </div>

        <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${
          lowStockCount > 0 ? 'border-rose-500/30 bg-rose-950/20' : 'border-slate-800/80 bg-slate-900/40'
        }`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Peringatan Stok (&lt;3)</p>
            <p className="text-sm font-black text-rose-300 mt-0.5">
              {lowStockCount} <span className="text-[11px] font-normal text-rose-400">Varian ({outOfStockCount} Habis)</span>
            </p>
          </div>
          <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>

        <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${
          metrics.expiringSoonSubsCount > 0 ? 'border-amber-500/30 bg-amber-950/20' : 'border-slate-800/80 bg-slate-900/40'
        }`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Habis dlm 3 Hari</p>
            <p className="text-sm font-black text-amber-300 mt-0.5">
              {metrics.expiringSoonSubsCount} <span className="text-[11px] font-normal text-amber-400">Langganan</span>
            </p>
          </div>
          <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${
          metrics.openTicketsCount > 0 ? 'border-indigo-500/30 bg-indigo-950/20' : 'border-slate-800/80 bg-slate-900/40'
        }`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Tiket Bantuan Aktif</p>
            <p className="text-sm font-black text-indigo-300 mt-0.5">
              {metrics.openTicketsCount} <span className="text-[11px] font-normal text-indigo-400">Tiket Terbuka</span>
            </p>
          </div>
          <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <Headphones className="h-4 w-4" />
          </div>
        </div>

      </div>

      {/* 7-Day Performance Chart & Quick Action Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sales Chart (8 Cols) */}
        <div className="lg:col-span-8 rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="font-extrabold text-base text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
                <span>Tren Penjualan 7 Hari Terakhir</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Grafik performa transaksi harian yang berhasil diselesaikan di toko
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 shrink-0">
              <button
                onClick={() => setChartMetric('revenue')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  chartMetric === 'revenue'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Omset (IDR)
              </button>
              <button
                onClick={() => setChartMetric('orders')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  chartMetric === 'orders'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Jumlah Order
              </button>
            </div>
          </div>

          {/* Chart Container */}
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => {
                    if (chartMetric === 'revenue') {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                      return val;
                    }
                    return val;
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-2xl border border-slate-700 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-1">
                          <p className="text-slate-400 font-semibold">{data.date}</p>
                          <p className="text-sm font-black text-cyan-300 font-mono">
                            {formatIDR(data.revenue)}
                          </p>
                          <p className="text-[11px] text-emerald-400 font-bold">
                            {data.orders} Transaksi Berhasil
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={chartMetric}
                  stroke={chartMetric === 'revenue' ? '#06b6d4' : '#10b981'}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill={chartMetric === 'revenue' ? 'url(#colorRevenue)' : 'url(#colorOrders)'}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Shortcuts & Navigation Links (4 Cols) */}
        <div className="lg:col-span-4 rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h2 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span>Pintasan Cepat Operasional</span>
              </h2>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                Shortcuts
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 mt-3.5">
              
              <Link
                href="/admin/orders?status=PENDING_PAYMENT"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-900 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-amber-300 transition">Pesanan Menunggu</p>
                    <p className="text-[10px] text-slate-400">Review bukti & status QRIS</p>
                  </div>
                </div>
                <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {metrics.pendingOrdersCount}
                </span>
              </Link>

              <Link
                href="/admin/inventory"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Key className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition">Inventori Akun Master</p>
                    <p className="text-[10px] text-slate-400">Shared & dedicated stock</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/admin/customers"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/40 hover:bg-slate-900 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-purple-300 transition">Manajemen Pelanggan</p>
                    <p className="text-[10px] text-slate-400">{metrics.totalCustomersCount} user terdaftar</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/admin/support"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-900 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Headphones className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition">Pusat Bantuan & Tiket</p>
                    <p className="text-[10px] text-slate-400">{metrics.openTicketsCount} tiket terbuka</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
              </Link>

            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Sistem Pengaturan Toko</span>
            <Link href="/admin/settings" className="font-bold text-cyan-400 hover:underline flex items-center gap-1">
              <span>Settings</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* Multi-Tab Interactive Live Data Section */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-5 shadow-xl">
        
        {/* Tab Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition ${
                activeTab === 'orders'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Pesanan Terbaru ({recentOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('stocks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition ${
                activeTab === 'stocks'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span>Peringatan Stok ({lowStockCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('expiring')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition ${
                activeTab === 'expiring'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="h-4 w-4 text-amber-300" />
              <span>Mendekati Expired ({expiringSubscriptions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('top_products')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition ${
                activeTab === 'top_products'
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Package className="h-4 w-4 text-purple-300" />
              <span>Produk Terlaris</span>
            </button>

          </div>

          <div className="shrink-0">
            {activeTab === 'orders' && (
              <Link href="/admin/orders" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                <span>Lihat Semua Pesanan</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
            {activeTab === 'stocks' && (
              <Link href="/admin/inventory" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                <span>Kelola Semua Stok</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
            {activeTab === 'expiring' && (
              <Link href="/admin/subscriptions" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                <span>Manajemen Langganan</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
            {activeTab === 'top_products' && (
              <Link href="/admin/products" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                <span>Katalog Produk</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* TAB 1: RECENT ORDERS */}
        {activeTab === 'orders' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">No. Pesanan</th>
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-4">Item Produk</th>
                  <th className="py-3 px-4">Total Bayar</th>
                  <th className="py-3 px-4">Status Pesanan</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      Belum ada transaksi pesanan yang tercatat.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-900/60 transition group">
                      <td className="py-3.5 px-4">
                        <Link href={`/admin/orders/${ord.id}`} className="font-mono font-bold text-cyan-400 hover:underline">
                          {ord.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{ord.customerName}</p>
                        <p className="text-[11px] text-slate-500">{ord.customerEmail}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-200 line-clamp-1">{ord.itemsSummary}</p>
                        {ord.itemCount > 1 && (
                          <span className="text-[10px] text-cyan-400">+{ord.itemCount - 1} item lainnya</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {formatIDR(ord.grandTotal)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                          ord.status === 'PAID' || ord.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : ord.status === 'PENDING_PAYMENT'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : ord.status === 'EXPIRED'
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        }`}>
                          {ord.status === 'COMPLETED' || ord.status === 'PAID' ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          ) : ord.status === 'PENDING_PAYMENT' ? (
                            <Clock className="h-3 w-3 text-amber-400" />
                          ) : null}
                          <span>{ord.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-400">
                        {formatDateJakarta(ord.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/orders/${ord.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition border border-slate-700"
                        >
                          <span>Detail</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: CRITICAL STOCK ALERTS */}
        {activeTab === 'stocks' && (
          <div className="space-y-4">
            {stockAlerts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-3 bg-slate-950/40 rounded-2xl border border-slate-800">
                <CheckCircle className="h-10 w-10 text-emerald-400/60" />
                <p className="font-bold text-white text-sm">Seluruh Inventori Produk Aman!</p>
                <p className="text-slate-400 max-w-md">Tidak ada varian produk yang berada di bawah ambang batas stok kritis (&lt; 3 unit/slot).</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {stockAlerts.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
                      item.isOutOfStock
                        ? 'border-rose-500/40 bg-rose-950/20'
                        : 'border-amber-500/30 bg-amber-950/15'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                          item.isOutOfStock
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {item.isOutOfStock ? 'STOK HABIS' : `SISA ${item.stock} SLOT/UNIT`}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{item.deliveryModel}</span>
                      </div>

                      <h4 className="font-bold text-white text-sm mt-2 line-clamp-1">{item.productName}</h4>
                      <p className="text-xs text-cyan-300 font-semibold line-clamp-1">{item.name}</p>
                      <p className="text-[11px] font-mono text-emerald-400 mt-1">{formatIDR(item.price)}</p>
                    </div>

                    <Link
                      href={`/admin/inventory?variantId=${item.id}`}
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 text-xs font-bold border border-slate-700 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Restock Akun / Kunci</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EXPIRING SUBSCRIPTIONS */}
        {activeTab === 'expiring' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-4">Layanan Produk</th>
                  <th className="py-3 px-4">Varian Paket</th>
                  <th className="py-3 px-4">Tanggal Berakhir</th>
                  <th className="py-3 px-4">Sisa Masa Aktif</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {expiringSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      Tidak ada langganan aktif yang akan berakhir dalam waktu dekat.
                    </td>
                  </tr>
                ) : (
                  expiringSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-900/60 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white">{sub.customerName}</p>
                        <p className="text-[11px] text-slate-500">{sub.customerEmail}</p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-cyan-300">{sub.productName}</td>
                      <td className="py-3.5 px-4 text-slate-300">{sub.variantName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{formatDateJakarta(sub.expiresAt)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                          sub.daysRemaining <= 1
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}>
                          <Clock className="h-3 w-3" />
                          <span>{sub.daysRemaining <= 0 ? 'Hari ini' : `${sub.daysRemaining} hari lagi`}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/subscriptions/${sub.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition border border-slate-700"
                        >
                          <span>Kelola</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: TOP SELLING PRODUCTS */}
        {activeTab === 'top_products' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topProducts.map((p, idx) => (
              <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-cyan-400 shrink-0 overflow-hidden">
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <span>#{idx + 1}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{p.categoryName}</span>
                  </div>
                  <h4 className="font-bold text-white text-xs truncate mt-0.5">{p.name}</h4>
                  <div className="flex items-center justify-between text-[11px] mt-1 text-slate-400">
                    <span className="font-mono font-bold text-emerald-400">Mulai {formatIDR(p.minPrice)}</span>
                    <span className="font-bold text-cyan-400">{p.soldCount} terjual</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
