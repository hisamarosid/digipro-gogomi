'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  Check,
  X,
  Zap,
  User,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateJakarta } from '@/lib/utils/formatters';
import { Pagination } from '@/components/ui/Pagination';

export function AdminReplacementsClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [meta, setMeta] = useState<any>({});

  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNote, setAdminNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchReplacements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (statusFilter) params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/admin/replacements?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setData(json.data);
        setMetrics(json.metrics || {});
        setMeta(json.meta || {});
      }
    } catch (err) {
      toast.error('Gagal memuat data replacement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplacements();
  }, [page, pageSize, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReplacements();
  };

  const handleApprove = async (id: string) => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/replacements/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || 'Gagal menyetujui replacement');
        return;
      }

      toast.success('Replacement berhasil disetujui!');
      setSelectedRequest(null);
      fetchReplacements();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/replacements/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason, adminNote }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || 'Gagal menolak replacement');
        return;
      }

      toast.success('Replacement berhasil ditolak');
      setShowRejectModal(false);
      setSelectedRequest(null);
      fetchReplacements();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessWaitingQueue = async () => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/replacements/process-waiting', {
        method: 'POST',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || 'Gagal memproses antrean stok');
        return;
      }

      toast.success(`Berhasil memproses ${json.data.processedCount} request dari antrean stok!`);
      fetchReplacements();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setSubmitting(false);
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
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Automated Warranty &amp; Replacements</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Penggantian Stok (Replacements)
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Monitor dan kelola permintaan klaim penggantian akun / lisensi digital bermasalah secara otomatis maupun manual.
            </p>
          </div>

          {metrics.waitingStockCount > 0 && (
            <button
              type="button"
              onClick={handleProcessWaitingQueue}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition shrink-0"
            >
              <Zap className="h-4 w-4" />
              <span>Proses Antrean Stok ({metrics.waitingStockCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Hari Ini</span>
          <p className="text-2xl font-black text-white">{metrics.todayCount || 0}</p>
        </div>

        <div className="bg-amber-950/20 p-4 rounded-2xl border border-amber-500/30 space-y-1">
          <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Pending Manual</span>
          <p className="text-2xl font-black text-amber-300">{metrics.pendingCount || 0}</p>
        </div>

        <div className="bg-cyan-950/20 p-4 rounded-2xl border border-cyan-500/30 space-y-1">
          <span className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider">Waiting Stock</span>
          <p className="text-2xl font-black text-cyan-300">{metrics.waitingStockCount || 0}</p>
        </div>

        <div className="bg-emerald-950/20 p-4 rounded-2xl border border-emerald-500/30 space-y-1">
          <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Completed</span>
          <p className="text-2xl font-black text-emerald-300">{metrics.completedCount || 0}</p>
        </div>

        <div className="bg-rose-950/20 p-4 rounded-2xl border border-rose-500/30 space-y-1">
          <span className="text-[11px] text-rose-400 font-bold uppercase tracking-wider">Rejected</span>
          <p className="text-2xl font-black text-rose-300">{metrics.failedCount || 0}</p>
        </div>
      </div>

      {/* Search Bar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Cari No. Request, Order, Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto rounded-xl bg-slate-950 border border-slate-800 py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option value="PENDING">PENDING (Manual)</option>
            <option value="WAITING_STOCK">WAITING_STOCK</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/40 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
            <span>Memuat data replacement...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Tidak ada permintaan replacement ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Request #</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Product / Variant</th>
                  <th className="p-4">Mode</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Waktu Request</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {data.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono font-bold text-emerald-400">{req.requestNumber}</td>
                    <td className="p-4">
                      <p className="font-bold text-white">{req.user?.name || 'Guest'}</p>
                      <p className="text-[10px] text-slate-400">{req.user?.email}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-200">{req.product?.name}</p>
                      <p className="text-[10px] text-emerald-400">{req.variant?.name}</p>
                    </td>
                    <td className="p-4">
                      <span className="rounded bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 border border-slate-700">
                        {req.mode}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full text-[10px] font-bold px-2.5 py-0.5 border ${
                          req.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : req.status === 'PENDING' || req.status === 'WAITING_STOCK'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{formatDateJakarta(req.requestedAt)}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 text-xs font-bold transition inline-flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={meta.totalPages || 1}
          totalItems={meta.total || 0}
          itemsPerPage={pageSize}
          onPageChange={(p) => setPage(p)}
          onItemsPerPageChange={(ps) => {
            setPageSize(ps);
            setPage(1);
          }}
        />
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Detail Replacement #{selectedRequest.requestNumber}</h3>
                <p className="text-xs text-slate-400">Order: {selectedRequest.order?.orderNumber}</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">Pelanggan</span>
                  <p className="font-bold text-white">{selectedRequest.user?.name}</p>
                  <p className="text-[10px] text-slate-400">{selectedRequest.user?.email}</p>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Status</span>
                  <span className="font-bold text-emerald-400">{selectedRequest.status}</span>
                  {selectedRequest.nextEligibleAtAfterProcessing && (
                    <p className="text-[10px] text-amber-400 font-semibold mt-1">
                      Next Eligible: {formatDateJakarta(selectedRequest.nextEligibleAtAfterProcessing)}
                    </p>
                  )}
                </div>
              </div>

              {selectedRequest.reason && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Alasan Customer:</span>
                  <p className="font-bold text-amber-400">{selectedRequest.reason}</p>
                  {selectedRequest.customerNote && (
                    <p className="text-slate-300 italic text-[11px] mt-1">"{selectedRequest.customerNote}"</p>
                  )}
                </div>
              )}

              {/* Previous vs New Credentials */}
              <div className="space-y-2">
                {selectedRequest.previousFulfillment && (
                  <div className="bg-rose-950/20 border border-rose-500/20 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-rose-400 uppercase block">Akun Lama (REPLACED):</span>
                    <p className="font-mono text-slate-300 text-[11px] break-all">
                      {selectedRequest.previousFulfillment.payloadRevealed || 'N/A'}
                    </p>
                  </div>
                )}

                {selectedRequest.newFulfillment && (
                  <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase block">Akun Baru (ACTIVE):</span>
                    <p className="font-mono text-emerald-300 text-[11px] break-all font-bold">
                      {selectedRequest.newFulfillment.payloadRevealed || 'N/A'}
                    </p>
                  </div>
                )}
              </div>

              {/* Admin Note Input */}
              {(selectedRequest.status === 'PENDING' || selectedRequest.status === 'WAITING_STOCK') && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-300 block">Catatan Admin (Opsional):</label>
                  <textarea
                    rows={2}
                    placeholder="Tulis instruksi atau catatan internal..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Actions for Pending Requests */}
            {(selectedRequest.status === 'PENDING' || selectedRequest.status === 'WAITING_STOCK') && (
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  disabled={submitting}
                  className="rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 px-4 py-2 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <X className="h-4 w-4" />
                  <span>Tolak Request</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={submitting}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2 text-xs font-extrabold transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>Setujui & Berikan Akun</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Tolak Permintaan Replacement</h3>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Alasan Penolakan (Customer-safe):</label>
              <textarea
                rows={3}
                placeholder="Misal: Masa garansi telah habis / akun terbukti melanggar ToS vendor..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={submitting}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 text-xs font-bold"
              >
                Konfirmasi Penolakan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
