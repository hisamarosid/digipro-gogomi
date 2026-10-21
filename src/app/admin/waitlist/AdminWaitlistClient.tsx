'use client';

import React, { useState } from 'react';
import { Bell, TrendingUp, DollarSign, Users, PackageCheck, Search, Filter, Sparkles, RefreshCw } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { formatIDR } from '@/lib/utils/formatters';

interface AdminWaitlistClientProps {
  activeWaitlistCount: number;
  notifiedCount: number;
  convertedCount: number;
  conversionRatePct: string;
  demandList: any[];
  waitlists: any[];
}

export function AdminWaitlistClient({
  activeWaitlistCount,
  notifiedCount,
  convertedCount,
  conversionRatePct,
  demandList,
  waitlists,
}: AdminWaitlistClientProps) {
  const totalPotentialGrossValue = demandList.reduce((sum, d) => sum + (d.potentialGrossValue || 0), 0);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredDemand = demandList.filter((d) =>
    (d.variantName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalItems = filteredDemand.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedDemand = filteredDemand.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto text-xs">
      
      {/* Header Banner Box Card (Exact match with Inventory screenshot header box) */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-extrabold uppercase tracking-wider">
              <Bell className="h-3.5 w-3.5" />
              <span>WAITLIST &amp; DEMAND PLANNING</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Waitlist &amp; Proyeksi Stok
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Menganalisis antrean minat produk yang habis stok serta proyeksi nilai omset potensial dari pelanggan terdaftar.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-4 py-2.5 rounded-full border border-slate-800 bg-[#0e131f] text-slate-200 font-bold text-xs">
              Total Request: <strong className="text-cyan-400 font-extrabold">{activeWaitlistCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row (Matches Inventory metric cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800/80 bg-[#0c1019] p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Waitlist Aktif</p>
          <p className="text-2xl font-black text-cyan-400">{activeWaitlistCount} <span className="text-xs text-slate-500 font-normal">Pelanggan</span></p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-[#07161d] p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Restock Notified</p>
          <p className="text-2xl font-black text-white">{notifiedCount} <span className="text-xs text-cyan-500 font-normal">Notified</span></p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-[#081711] p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Conversion Rate</p>
          <p className="text-2xl font-black text-emerald-400">{conversionRatePct}%</p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-[#161208] p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Proyeksi Gross Demand</p>
          <p className="text-2xl font-black text-amber-300 font-mono">Rp{totalPotentialGrossValue.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* Main Table Panel (Matches Inventory main panel layout) */}
      <div className="rounded-3xl border border-slate-800/80 bg-[#0c1019] p-6 space-y-4 shadow-2xl">
        
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-amber-400" />
            <span>Analisis Permintaan Stok Per Varian Produk</span>
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Cari varian produk..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#070a10] border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#080b11] border-b border-slate-800/80 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-4">PRODUK VARIAN</th>
                <th className="py-3.5 px-4">JUMLAH WAITLIST</th>
                <th className="py-3.5 px-4">STOK READY CURRENTLY</th>
                <th className="py-3.5 px-4">HARGA JUAL PER UNIT</th>
                <th className="py-3.5 px-4">POTENSI NILAI OMSET (GROSS DEMAND)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300 font-mono text-xs">
              {paginatedDemand.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-sans">
                    Tidak ada antrean waitlist yang cocok dengan kriteria.
                  </td>
                </tr>
              ) : (
                paginatedDemand.map((d) => (
                  <tr key={d.variantId} className="hover:bg-slate-900/30 transition">
                    <td className="py-3.5 px-4 font-sans font-bold text-white flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      <span>{d.variantName}</span>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className="rounded-full bg-[#061d2a] text-[#06b6d4] border border-[#06b6d4]/30 px-3 py-0.5 text-[10px] font-extrabold tracking-wide">
                        {d.activeWaitlistCount} Pelanggan
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-semibold">{d.eligibleStock} Available</td>
                    <td className="py-3.5 px-4 font-semibold text-white">Rp{(d.unitPrice || 0).toLocaleString('id-ID')}</td>
                    <td className="py-3.5 px-4 font-black text-amber-400">Rp{(d.potentialGrossValue || 0).toLocaleString('id-ID')}</td>
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
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
}
