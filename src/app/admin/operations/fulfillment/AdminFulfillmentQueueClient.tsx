'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  RotateCcw,
  Zap,
  ChevronRight,
  XCircle,
  ShieldAlert,
  Loader2,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateJakarta } from '@/lib/utils/formatters';

export function AdminFulfillmentQueueClient() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [isProcessingRetry, setIsProcessingRetry] = useState(false);

  const fetchQueueData = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/admin/operations/fulfillment', window.location.origin);
      if (statusFilter) url.searchParams.set('status', statusFilter);
      if (search) url.searchParams.set('search', search);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setJobs(json.data);
        setStats(json.stats);
      }
    } catch {
      toast.error('Gagal memuat data antrean fulfillment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
  }, [statusFilter, search]);

  const handleRetryJob = async (jobId: string) => {
    setIsProcessingRetry(true);
    try {
      const res = await fetch('/api/admin/operations/fulfillment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RETRY_JOB', jobId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Job fulfillment berhasil di-queue dan diproses ulang!');
        fetchQueueData();
        if (selectedJob?.id === jobId) setSelectedJob(null);
      } else {
        toast.error(`Gagal retry: ${json.error || 'Terjadi kesalahan'}`);
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsProcessingRetry(false);
    }
  };

  const handleBatchRetryWaitingStock = async () => {
    setIsProcessingRetry(true);
    try {
      const res = await fetch('/api/admin/operations/fulfillment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchRetryWaitingStock: true }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || 'Berhasil memproses ulang antrean WAITING_STOCK');
        fetchQueueData();
      }
    } catch {
      toast.error('Gagal retry batch waiting stock');
    } finally {
      setIsProcessingRetry(false);
    }
  };

  const getAgeBadge = (createdAt: string) => {
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const ageMin = Math.floor(ageMs / (1000 * 60));

    if (ageMin < 5) {
      return <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono">{ageMin}m ago</span>;
    } else if (ageMin < 30) {
      return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">{ageMin}m ago</span>;
    } else if (ageMin < 120) {
      return <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded text-[10px] font-bold">{ageMin}m ago</span>;
    }
    return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-extrabold animate-pulse">{ageMin}m CRITICAL</span>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'QUEUED':
      case 'RETRY_SCHEDULED':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">QUEUED</span>;
      case 'PROCESSING':
        return <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase animate-pulse">PROCESSING</span>;
      case 'WAITING_STOCK':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">WAITING STOCK</span>;
      case 'WAITING_MANUAL':
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">WAITING MANUAL</span>;
      case 'COMPLETED':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">COMPLETED</span>;
      case 'FAILED':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">FAILED</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px]">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 text-xs">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Queued</p>
          <p className="text-2xl font-black text-blue-400">{stats.queuedCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-1">
          <p className="text-[11px] text-cyan-400 uppercase font-bold tracking-wider">Processing</p>
          <p className="text-2xl font-black text-cyan-300">{stats.processingCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1">
          <p className="text-[11px] text-amber-400 uppercase font-bold tracking-wider">Waiting Stock</p>
          <p className="text-2xl font-black text-amber-300">{stats.waitingStockCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-1">
          <p className="text-[11px] text-purple-400 uppercase font-bold tracking-wider">Waiting Manual</p>
          <p className="text-2xl font-black text-purple-300">{stats.waitingManualCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-4 space-y-1">
          <p className="text-[11px] text-sky-400 uppercase font-bold tracking-wider">Retry Sched</p>
          <p className="text-2xl font-black text-sky-300">{stats.retryScheduledCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-1">
          <p className="text-[11px] text-rose-400 uppercase font-bold tracking-wider">Failed</p>
          <p className="text-2xl font-black text-rose-300">{stats.failedCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] text-emerald-400 uppercase font-bold tracking-wider">Completed</p>
          <p className="text-2xl font-black text-emerald-300">{stats.completedCount || 0}</p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari order number / produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option value="QUEUED">QUEUED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="WAITING_STOCK">WAITING_STOCK</option>
            <option value="WAITING_MANUAL">WAITING_MANUAL</option>
            <option value="RETRY_SCHEDULED">RETRY_SCHEDULED</option>
            <option value="FAILED">FAILED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleBatchRetryWaitingStock}
            disabled={isProcessingRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 font-bold transition disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Retry Batch Waiting Stock</span>
          </button>

          <button
            onClick={fetchQueueData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Queue Table */}
      <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Job ID</th>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Produk & Model</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Attempt</th>
                <th className="py-3 px-4">Umur (Age)</th>
                <th className="py-3 px-4">Alasan Terakhir</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-cyan-400" />
                    Memuat antrean fulfillment...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Tidak ada job fulfillment ditemukan
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-cyan-400 font-bold">
                      #{job.id.slice(-6)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{job.order?.orderNumber || 'ORD-N/A'}</p>
                      <p className="text-[10px] text-slate-500">{job.order?.user?.name || job.order?.guestEmail || 'Guest'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-200">{job.orderItem?.productName}</p>
                      <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                        {job.deliveryModel}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(job.status)}</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {job.attemptCount} / {job.maxAttempts}
                    </td>
                    <td className="py-3 px-4">{getAgeBadge(job.createdAt)}</td>
                    <td className="py-3 px-4 max-w-xs truncate text-[11px] text-rose-400">
                      {job.lastErrorCode ? (
                        <span title={job.lastErrorMessage || job.lastErrorCode} className="font-mono bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                          {job.lastErrorCode}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition text-[11px]"
                      >
                        Detail & Logs
                      </button>

                      {job.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          disabled={isProcessingRetry}
                          className="px-2.5 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition text-[11px] disabled:opacity-50"
                        >
                          Retry
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

      {/* Job Details Drawer Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Fulfillment Job Detail #{selectedJob.id.slice(-8)}</h3>
                <p className="text-xs text-slate-400">Order: {selectedJob.order?.orderNumber} | Item: {selectedJob.orderItem?.productName}</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            {/* Diagnostics & Attempts Logs */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-cyan-400" />
                <span>Attempt History ({selectedJob.attempts?.length || 0})</span>
              </h4>

              <div className="space-y-2">
                {selectedJob.attempts?.map((att: any, idx: number) => (
                  <div key={att.id || idx} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-cyan-400 font-bold">Attempt #{att.attemptNumber}</span>
                      <span className="text-slate-500">{formatDateJakarta(att.startedAt)}</span>
                    </div>
                    {att.errorCode && (
                      <p className="text-rose-400 font-mono font-bold">Error Code: {att.errorCode} [{att.errorCategory}]</p>
                    )}
                    {att.diagnosticSnapshot && (
                      <pre className="p-2 bg-slate-900 rounded-xl text-[10px] font-mono text-slate-300 overflow-x-auto border border-slate-800">
                        {att.diagnosticSnapshot}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setSelectedJob(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:text-white">
                Tutup
              </button>
              {selectedJob.status !== 'COMPLETED' && (
                <button
                  onClick={() => handleRetryJob(selectedJob.id)}
                  disabled={isProcessingRetry}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md shadow-cyan-600/20"
                >
                  Eksekusi Retry Sekarang
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
