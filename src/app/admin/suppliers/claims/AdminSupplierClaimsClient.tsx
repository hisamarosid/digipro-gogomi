'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  DollarSign,
  MessageSquare,
  Truck,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export function AdminSupplierClaimsClient() {
  const [claims, setClaims] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchClaims = async () => {
    setLoading(true);
    try {
      let url = '/api/admin/suppliers/claims?';
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;
      if (search.trim()) url += `q=${encodeURIComponent(search.trim())}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setClaims(json.data.claims);
        setSummary(json.data.summary);
      }
    } catch {
      toast.error('Gagal memuat data klaim garansi supplier');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClaims();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY_TO_CLAIM':
      case 'DRAFT':
        return (
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold text-[10px] flex items-center gap-1">
            <Clock className="h-3 w-3" /> PERLU DIAJUKAN
          </span>
        );
      case 'WAITING_SUPPLIER':
      case 'SUBMITTED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px] flex items-center gap-1 animate-pulse">
            <AlertTriangle className="h-3 w-3" /> MENUNGGU SUPPLIER
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold text-[10px] flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> DISETUJUI
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> SELESAI (RECOVERY)
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-[10px] flex items-center gap-1">
            <XCircle className="h-3 w-3" /> DITOLAK SUPPLIER
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px]">
            {status}
          </span>
        );
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
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Supplier Warranty &amp; Loss Recovery</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Klaim Garansi &amp; Recovery Supplier
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Pusat pelacakan garansi internal toko, pengajuan klaim ke vendor external, dan pencatatan recovery kerugian finansial modal inventori.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchClaims()}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-cyan-500/20 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 space-y-1">
            <p className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider">Perlu Diajukan</p>
            <p className="text-2xl font-black text-cyan-300">{summary.readyToClaim}</p>
          </div>

          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 space-y-1">
            <p className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Menunggu Supplier</p>
            <p className="text-2xl font-black text-amber-300">{summary.waitingSupplier}</p>
          </div>

          <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 space-y-1">
            <p className="text-[11px] text-blue-400 font-bold uppercase tracking-wider">Disetujui</p>
            <p className="text-2xl font-black text-blue-300">{summary.approved}</p>
          </div>

          <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-950/20 space-y-1">
            <p className="text-[11px] text-rose-400 font-bold uppercase tracking-wider">Ditolak</p>
            <p className="text-2xl font-black text-rose-300">{summary.rejected}</p>
          </div>

          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-1 col-span-2 sm:col-span-1">
            <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Potensi Recovery</p>
            <p className="text-xl font-black font-mono text-emerald-300">{formatIDR(summary.potentialRecovery)}</p>
          </div>

          <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-950/20 space-y-1 col-span-2 sm:col-span-1">
            <p className="text-[11px] text-purple-400 font-bold uppercase tracking-wider">Recovered Bulan Ini</p>
            <p className="text-xl font-black font-mono text-purple-300">{formatIDR(summary.recoveredMonth)}</p>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'ALL', label: 'Semua Klaim' },
            { id: 'READY_TO_CLAIM', label: 'Perlu Diajukan' },
            { id: 'WAITING_SUPPLIER', label: 'Menunggu Supplier' },
            { id: 'APPROVED', label: 'Disetujui' },
            { id: 'CLOSED', label: 'Selesai (Recovery)' },
            { id: 'REJECTED', label: 'Ditolak' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setStatusFilter(t.id)}
              className={`px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                statusFilter === t.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari klaim SC-..., ID Stok..."
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none w-60"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
          >
            Cari
          </button>
        </form>
      </div>

      {/* Claims Table */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">No. Klaim & Tanggal</th>
                <th className="p-4">Supplier</th>
                <th className="p-4">Kendala / Failure</th>
                <th className="p-4">Nilai Klaim</th>
                <th className="p-4">Status Klaim</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <div className="animate-spin h-6 w-6 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-2" />
                    Memuat daftar klaim garansi supplier...
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Tidak ada klaim garansi supplier yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <p className="font-extrabold text-white font-mono">{claim.claimNumber}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatDateJakarta(claim.createdAt)}</p>
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-white">{claim.supplier?.name || claim.supplierNameSnapshot}</p>
                      <p className="text-[10px] text-cyan-300 font-mono">Code: {claim.supplier?.code || 'SUP-000'}</p>
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-amber-300">{claim.failureReason}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[200px]">Asset ID: {claim.assetId}</p>
                    </td>

                    <td className="p-4">
                      <p className="font-mono font-extrabold text-cyan-300">{formatIDR(claim.claimValue)}</p>
                      {claim.resolutionAmount ? (
                        <p className="text-[10px] text-emerald-400 font-mono">Rec: {formatIDR(claim.resolutionAmount)}</p>
                      ) : null}
                    </td>

                    <td className="p-4">{getStatusBadge(claim.status)}</td>

                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/suppliers/claims/${claim.id}`}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition inline-flex items-center gap-1 shadow-md"
                      >
                        <span>Workspace Klaim</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
