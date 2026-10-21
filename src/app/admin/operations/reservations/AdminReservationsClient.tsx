'use client';

import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, AlertCircle, CheckCircle, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateJakarta } from '@/lib/utils/formatters';

export function AdminReservationsClient() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchReservationsData = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/admin/operations/reservations', window.location.origin);
      if (statusFilter) url.searchParams.set('status', statusFilter);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setReservations(json.data);
        setStats(json.stats);
      }
    } catch {
      toast.error('Gagal memuat data reservasi stok');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservationsData();
  }, [statusFilter]);

  const handleCleanupExpired = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/operations/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLEANUP_EXPIRED' }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Berhasil membersihkan ${json.result?.releasedCount || 0} reservasi kadaluarsa`);
        fetchReservationsData();
      }
    } catch {
      toast.error('Gagal membersihkan reservasi');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForceRelease = async (orderId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/operations/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'FORCE_RELEASE', orderId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Berhasil melepaskan reservasi stok order`);
        fetchReservationsData();
      }
    } catch {
      toast.error('Gagal melepaskan reservasi');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold text-[10px]">ACTIVE</span>;
      case 'CONSUMED':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold text-[10px]">CONSUMED</span>;
      case 'RELEASED':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold text-[10px]">RELEASED</span>;
      case 'EXPIRED':
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full text-[10px]">EXPIRED</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px]">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 text-xs">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1">
          <p className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Active Reserved</p>
          <p className="text-2xl font-black text-amber-300">{stats.activeCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Consumed</p>
          <p className="text-2xl font-black text-emerald-300">{stats.consumedCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-1">
          <p className="text-[11px] text-blue-400 font-bold uppercase tracking-wider">Released</p>
          <p className="text-2xl font-black text-blue-300">{stats.releasedCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Expired</p>
          <p className="text-2xl font-black text-slate-400">{stats.expiredCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-1">
          <p className="text-[11px] text-rose-400 font-bold uppercase tracking-wider">Stale Warnings</p>
          <p className="text-2xl font-black text-rose-300">{stats.staleCount || 0}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Semua Status Reservasi</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="CONSUMED">CONSUMED</option>
            <option value="RELEASED">RELEASED</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCleanupExpired}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 font-bold transition disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Cleanup Expired</span>
          </button>

          <button
            onClick={fetchReservationsData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Reservation ID</th>
                <th className="py-3 px-4">Tipe Resource</th>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Waktu Dibuat</th>
                <th className="py-3 px-4">Kadaluarsa (ExpiresAt)</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-400" />
                    Memuat data reservasi stok...
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">Tidak ada reservasi ditemukan</td>
                </tr>
              ) : (
                reservations.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-amber-400 font-bold">#{res.id.slice(-8)}</td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-300">
                        {res.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{res.order?.orderNumber || 'N/A'}</p>
                      <p className="text-[10px] text-slate-500">{res.user?.name || res.user?.email || 'Guest'}</p>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(res.status)}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{formatDateJakarta(res.createdAt)}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">{formatDateJakarta(res.expiresAt)}</td>
                    <td className="py-3 px-4 text-right">
                      {res.status === 'ACTIVE' && res.orderId && (
                        <button
                          onClick={() => handleForceRelease(res.orderId)}
                          disabled={isProcessing}
                          className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 font-bold transition text-[11px]"
                        >
                          Force Release
                        </button>
                      )}
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
