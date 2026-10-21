'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Download,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet,
  PieChart,
  Loader2,
  Calendar,
  Truck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import { Pagination } from '@/components/ui/Pagination';

export function AdminProfitReportClient() {
  const [metrics, setMetrics] = useState<any>({});
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [selectedSupplierId, setSelectedSupplierId] = useState('ALL');

  // Pagination state for snapshot history
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchProfitReport = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/analytics/profit?period=${period}`;
      if (selectedSupplierId !== 'ALL') {
        url += `&supplierId=${selectedSupplierId}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setMetrics(json.metrics || {});
        setSnapshots(json.snapshots || []);
        if (json.suppliers) setSuppliers(json.suppliers);
      }
    } catch {
      toast.error('Gagal memuat laporan laba kotor & finansial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfitReport();
    setCurrentPage(1);
  }, [period, selectedSupplierId]);

  const handleExportCsv = () => {
    let url = `/api/admin/analytics/profit?period=${period}&export=csv`;
    if (selectedSupplierId !== 'ALL') {
      url += `&supplierId=${selectedSupplierId}`;
    }
    window.open(url, '_blank');
    toast.success('Laporan finansial CSV berhasil di-download!');
  };

  // Pagination calculation
  const totalItems = snapshots.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedSnapshots = snapshots.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 text-xs max-w-7xl mx-auto">
      
      {/* Header Banner Box Card (Exact match with Inventory screenshot header box) */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-extrabold uppercase tracking-wider">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>FINANCIAL ANALYTICS &amp; GROSS PROFIT</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Analitik Biaya, COGS &amp; Laba Kotor (Gross Profit)
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Menganalisis pendapatan bersih, beban pokok penjualan (COGS), margin profit, serta performa per supplier pemasok inventori.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Supplier Filter */}
            <div className="flex items-center gap-1.5 bg-[#070a10] border border-slate-800 rounded-full px-3 py-2">
              <Truck className="h-3.5 w-3.5 text-cyan-400" />
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none font-bold py-0.5"
              >
                <option value="ALL" className="bg-slate-900">Semua Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900">
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Period Filter */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-[#070a10] border border-slate-800 rounded-full py-2 px-3.5 text-xs text-white focus:border-cyan-500 focus:outline-none font-bold"
            >
              <option value="7d">7 Hari Terakhir</option>
              <option value="30d">30 Hari Terakhir</option>
              <option value="this_month">Bulan Ini</option>
            </select>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#00b4d8] hover:bg-cyan-300 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cost Coverage Incomplete Warning */}
      {metrics?.isCostIncomplete && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-400 text-xs">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <span className="font-bold block">Peringatan Cakupan Modal (Cost Coverage: {metrics.costCoveragePercentage}%)</span>
            <span>Sebagian transaksi memiliki inventori tanpa data modal (Cost Unknown). Perhitungan profit diperkirakan berdasar stok yang memiliki data modal.</span>
          </div>
        </div>
      )}

      {/* Financial KPI Cards (Matches Inventory metric cards style) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="rounded-2xl border border-slate-800/80 bg-[#0c1019] p-4 space-y-1">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gross Sales Revenue</p>
          <p className="text-xl font-black text-white font-mono">{formatIDR(metrics?.totalSubtotal || 0)}</p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-[#07161d] p-4 space-y-1">
          <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Net Sales (Pendapatan)</p>
          <p className="text-xl font-black text-cyan-400 font-mono">{formatIDR(metrics?.totalGrossRevenue || 0)}</p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-[#161208] p-4 space-y-1">
          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Biaya Modal (COGS)</p>
          <p className="text-xl font-black text-amber-400 font-mono">{formatIDR(metrics?.totalCOGS || 0)}</p>
        </div>

        <div className="rounded-2xl border border-rose-500/30 bg-[#1e0a0d] p-4 space-y-1">
          <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Replacement Loss</p>
          <p className="text-xl font-black text-rose-400 font-mono">{formatIDR(metrics?.totalReplacementCost || 0)}</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-[#081711] p-4 space-y-1">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Laba Kotor (Gross Profit)</p>
          <p className="text-xl font-black text-emerald-400 font-mono">{formatIDR(metrics?.totalGrossProfit || 0)}</p>
          <p className="text-[10px] text-emerald-400 font-bold">Margin: {metrics?.overallMargin || 0}%</p>
        </div>
      </div>

      {/* Snapshot History Table (Matches Inventory main table panel style) */}
      <div className="rounded-3xl border border-slate-800/80 bg-[#0c1019] p-6 space-y-4 shadow-2xl">
        <div className="pb-2 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>Snapshot Finansial Transaksi Terbaru ({snapshots.length})</span>
            </h3>
            {selectedSupplierId !== 'ALL' && (
              <span className="rounded-full bg-[#061d2a] text-[#06b6d4] border border-[#06b6d4]/30 px-3 py-0.5 text-[10px] font-extrabold tracking-wide">
                Supplier Filter Aktif
              </span>
            )}
          </div>
          <button
            onClick={fetchProfitReport}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-800 bg-[#0e131f] hover:bg-slate-800 text-slate-300 text-xs font-bold transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#080b11] border-b border-slate-800/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">NO. ORDER</th>
                <th className="py-3.5 px-4">SUBTOTAL</th>
                <th className="py-3.5 px-4">DISKON KUPON/COIN</th>
                <th className="py-3.5 px-4">UANG DITERIMA (QRIS)</th>
                <th className="py-3.5 px-4">COGS</th>
                <th className="py-3.5 px-4">REPLACEMENT COST</th>
                <th className="py-3.5 px-4">GROSS PROFIT</th>
                <th className="py-3.5 px-4">MARGIN %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    Menghitung laporan finansial &amp; COGS...
                  </td>
                </tr>
              ) : snapshots.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">Belum ada transaksi dalam periode ini</td>
                </tr>
              ) : (
                paginatedSnapshots.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/30 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">{s.order?.orderNumber || 'N/A'}</td>
                    <td className="py-3.5 px-4 font-mono">{formatIDR(s.subtotal)}</td>
                    <td className="py-3.5 px-4 font-mono text-rose-400">-{formatIDR(s.productDiscount + s.couponDiscount + s.coinDiscount)}</td>
                    <td className="py-3.5 px-4 font-mono text-cyan-400 font-bold">{formatIDR(s.cashPayableAmount)}</td>
                    <td className="py-3.5 px-4 font-mono text-amber-400">{formatIDR(s.recognizedCOGS)}</td>
                    <td className="py-3.5 px-4 font-mono text-rose-400">{formatIDR(s.replacementCost)}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">{formatIDR(s.grossProfit)}</td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={s.grossMargin < 15 ? 'text-amber-400' : 'text-emerald-400'}>{s.grossMargin}%</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Component */}
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
