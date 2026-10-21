'use client';

import React, { useState, useEffect } from 'react';
import { HeartPulse, AlertTriangle, ShieldAlert, CheckCircle, RefreshCw, Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateJakarta } from '@/lib/utils/formatters';

export function AdminInventoryHealthClient() {
  const [summary, setSummary] = useState<any>({});
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideItem, setOverrideItem] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState('DISABLED');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/operations/inventory-health');
      const json = await res.json();
      if (json.success) {
        setSummary(json.summary);
        setAccountsList(json.accountsHealthList);
      }
    } catch {
      toast.error('Gagal memuat data kesehatan inventori');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const handleOverrideStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      toast.error('Alasan perubahan status wajib diisi');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/operations/inventory-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceType: 'SHARED_ACCOUNT',
          resourceId: overrideItem.id,
          newStatus,
          reason: overrideReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || 'Status inventori berhasil diubah!');
        setOverrideItem(null);
        setOverrideReason('');
        fetchHealthData();
      } else {
        toast.error(`Gagal: ${json.error}`);
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'HEALTHY':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold text-[10px]">HEALTHY</span>;
      case 'WARNING':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold text-[10px]">WARNING</span>;
      case 'EXPIRING_SOON':
        return <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold text-[10px]">EXPIRING SOON</span>;
      case 'CRITICAL':
        return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-extrabold text-[10px] animate-pulse">CRITICAL</span>;
      case 'INVALID':
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold text-[10px]">INVALID</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px]">{health}</span>;
    }
  };

  return (
    <div className="space-y-6 text-xs">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Healthy Stock</p>
          <p className="text-2xl font-black text-emerald-300">{summary.healthyCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1">
          <p className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Warning</p>
          <p className="text-2xl font-black text-amber-300">{summary.warningCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-orange-500/30 bg-orange-950/20 p-4 space-y-1">
          <p className="text-[11px] text-orange-400 font-bold uppercase tracking-wider">Expiring Soon</p>
          <p className="text-2xl font-black text-orange-300">{summary.expiringSoonCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-1">
          <p className="text-[11px] text-rose-400 font-bold uppercase tracking-wider">Critical</p>
          <p className="text-2xl font-black text-rose-300">{summary.criticalCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Disabled</p>
          <p className="text-2xl font-black text-slate-400">{summary.invalidCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-1">
          <p className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider">Health Score</p>
          <p className="text-2xl font-black text-cyan-300">{summary.healthPercentage || 100}%</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        <h3 className="font-bold text-white text-xs flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-emerald-400" />
          <span>Monitor Kesehatan Akun Master Shared & Slot</span>
        </h3>

        <button
          onClick={fetchHealthData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Health</span>
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Label Akun</th>
                <th className="py-3 px-4">Produk & Paket</th>
                <th className="py-3 px-4">Kapasitas Slot</th>
                <th className="py-3 px-4">Expired Master</th>
                <th className="py-3 px-4">Kesehatan</th>
                <th className="py-3 px-4">Alasan Kesehatan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-400" />
                    Menghitung skor kesehatan inventori...
                  </td>
                </tr>
              ) : accountsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">Tidak ada data inventori shared</td>
                </tr>
              ) : (
                accountsList.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white">{acc.label}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-200">{acc.productName}</p>
                      <p className="text-[10px] text-slate-500">{acc.variantName}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span className="text-emerald-400">{acc.availableSlots}</span> / {acc.maxSlots} Avail
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {acc.masterExpiresAt ? formatDateJakarta(acc.masterExpiresAt) : 'Permanen'}
                    </td>
                    <td className="py-3 px-4">{getHealthBadge(acc.health)}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{acc.reasonMessage}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setOverrideItem(acc);
                          setNewStatus(acc.status);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition flex items-center gap-1 ml-auto"
                      >
                        <Edit className="h-3 w-3" /> Override Status
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Override Modal */}
      {overrideItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
          <form onSubmit={handleOverrideStatus} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Override Health Status #{overrideItem.label}</h3>
              <button type="button" onClick={() => setOverrideItem(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Status Baru</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="AVAILABLE">AVAILABLE (Tersedia)</option>
                  <option value="PARTIALLY_USED">PARTIALLY_USED</option>
                  <option value="FULL">FULL (Penuh)</option>
                  <option value="EXPIRING">EXPIRING (Mendekati Kadaluarsa)</option>
                  <option value="INVALID">INVALID (Bermasalah)</option>
                  <option value="DISABLED">DISABLED (Dinonaktifkan)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Alasan Perubahan Status (Wajib Audit Log)</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Contoh: Akun bermasalah setelah pengecekan manual tim..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setOverrideItem(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold">
                Batal
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold disabled:opacity-50">
                {isSubmitting ? 'Menyimpan...' : 'Simpan Override'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
