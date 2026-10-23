'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Send,
  Save,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminEmailSettingsAndLogsPage() {
  const [settings, setSettings] = useState<any>({
    mode: 'development',
    sendEnabled: false,
    devStrategy: 'capture',
    devRedirectTo: '',
    fromName: 'Gogomi Store',
    fromAddress: 'no-reply@gogomi.store',
    replyTo: 'support@gogomi.store',
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Email Logs
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/email/settings');
      const json = await res.json();
      if (res.ok && json.success) {
        setSettings(json.data);
      }
    } catch {
      toast.error('Gagal memuat pengaturan email');
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const fetchLogs = async () => {
    setIsLoadingJobs(true);
    try {
      let url = `/api/admin/email/logs?page=${page}&limit=15`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json.success) {
        setJobs(json.data.items || []);
        setTotalPages(json.data.totalPages || 1);
        setStatusCounts(json.data.statusCounts || {});
      }
    } catch {
      toast.error('Gagal memuat log email');
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, statusFilter]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/admin/email/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Pengaturan email global berhasil disimpan');
        fetchSettings();
      } else {
        toast.error(json.error || 'Gagal menyimpan');
      }
    } catch {
      toast.error('Gagal menyimpan pengaturan email');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Email uji coba berhasil dimasukkan ke antrean!');
        fetchLogs();
      } else {
        toast.error(json.error || 'Gagal menguji email');
      }
    } catch {
      toast.error('Gagal mengirim email tes');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const res = await fetch('/api/admin/email/logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RETRY', jobId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Email job dijadwalkan ulang untuk retry');
        fetchLogs();
      }
    } catch {
      toast.error('Gagal memproses retry');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">SENT</span>;
      case 'DEV_CAPTURED':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">DEV CAPTURED</span>;
      case 'QUEUED':
        return <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">QUEUED</span>;
      case 'RETRY_SCHEDULED':
        return <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 font-bold text-[10px]">RETRY SCHEDULED</span>;
      case 'FAILED':
        return <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px]">FAILED</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">{status}</span>;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Mail className="h-7 w-7 text-cyan-400" />
            <span>Pengaturan & Audit Log Email Notification</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi mode pengiriman email, strategi development, sender branding, serta monitoring antrean & delivery log.
          </p>
        </div>

        <Link
          href="/admin/dev/email"
          className="px-4 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-bold text-xs transition flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Buka Dev Preview Inbox</span>
        </Link>
      </div>

      {/* Global Settings Panel */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-cyan-400" />
          <span>Konfigurasi Mode Global Email System</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-2">
            <label className="block text-slate-300 font-bold">Email System Mode</label>
            <select
              value={settings.mode}
              onChange={(e) => setSettings({ ...settings, mode: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:border-cyan-500 focus:outline-none"
            >
              <option value="disabled">DISABLED (Matikan Email Total)</option>
              <option value="development">DEVELOPMENT (Aman untuk Dev)</option>
              <option value="production">PRODUCTION (Kirim ke Customer)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-300 font-bold">Dev Delivery Strategy</label>
            <select
              value={settings.devStrategy}
              onChange={(e) => setSettings({ ...settings, devStrategy: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:border-cyan-500 focus:outline-none"
            >
              <option value="capture">Capture Mode (Simpan di Dev Inbox)</option>
              <option value="redirect">Redirect Mode (Alihkan Email)</option>
              <option value="smtp">Local SMTP / Provider</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-300 font-bold">Pengirim (From Name)</label>
            <input
              type="text"
              value={settings.fromName}
              onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-slate-300 font-bold">Email Pengirim (From Address)</label>
            <input
              type="email"
              value={settings.fromAddress}
              onChange={(e) => setSettings({ ...settings, fromAddress: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-slate-300 font-bold">Reply-To Address</label>
            <input
              type="email"
              value={settings.replyTo}
              onChange={(e) => setSettings({ ...settings, replyTo: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {settings.devStrategy === 'redirect' && (
            <div className="space-y-2">
              <label className="block text-amber-300 font-bold">Email Dev Redirect To</label>
              <input
                type="email"
                placeholder="developer@example.com"
                value={settings.devRedirectTo || ''}
                onChange={(e) => setSettings({ ...settings, devRedirectTo: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-300 focus:outline-none"
              />
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80">
          <button
            type="button"
            disabled={isSendingTest}
            onClick={handleSendTestEmail}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-2"
          >
            <Send className="h-4 w-4 text-cyan-400" />
            <span>{isSendingTest ? 'Mengirim...' : 'Kirim Email Uji Coba (Test Email)'}</span>
          </button>

          <button
            type="button"
            disabled={isSavingSettings}
            onClick={handleSaveSettings}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{isSavingSettings ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
          </button>
        </div>
      </div>

      {/* Email Queue & Delivery Logs */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-cyan-400" />
            <span>Audit Log Delivery Email Jobs</span>
          </h2>

          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            {['ALL', 'QUEUED', 'DEV_CAPTURED', 'SENT', 'FAILED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => { setStatusFilter(st); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  statusFilter === st
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st} {statusCounts[st] !== undefined ? `(${statusCounts[st]})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 overflow-hidden">
          {isLoadingJobs ? (
            <div className="p-8 text-center text-slate-400 text-xs">Memuat Log Email Jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">Belum ada history email job yang tercatat.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Recipient</th>
                    <th className="p-4">Subject</th>
                    <th className="p-4">Template</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Attempts</th>
                    <th className="p-4">Waktu Queued</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {jobs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <div className="font-bold text-white">{item.recipientEmail}</div>
                        {item.originalRecipientEmail && item.originalRecipientEmail !== item.recipientEmail && (
                          <div className="text-[10px] text-amber-400">Orig: {item.originalRecipientEmail}</div>
                        )}
                      </td>
                      <td className="p-4 font-bold text-white max-w-xs truncate">{item.subjectSnapshot}</td>
                      <td className="p-4 font-mono text-[11px] text-cyan-300">{item.templateKey}</td>
                      <td className="p-4">
                        {getStatusBadge(item.status)}
                        {(item.status === 'FAILED' || item.status === 'RETRY_SCHEDULED') && item.lastErrorMessageSafe && (
                          <div
                            className="mt-1 max-w-[220px] truncate text-[10px] text-rose-300/80"
                            title={`${item.lastErrorCode || ''} ${item.lastErrorMessageSafe}`}
                          >
                            {item.lastErrorCode ? `${item.lastErrorCode}: ` : ''}{item.lastErrorMessageSafe}
                          </div>
                        )}
                        {item.status === 'RETRY_SCHEDULED' && item.nextAttemptAt && (
                          <div className="mt-0.5 text-[10px] text-slate-500">
                            Coba lagi: {new Date(item.nextAttemptAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-mono text-center">{item.attemptCount} / {item.maxAttempts}</td>
                      <td className="p-4 text-slate-400 text-[11px]">
                        {new Date(item.queuedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="p-4 text-right">
                        {(item.status === 'FAILED' || item.status === 'RETRY_SCHEDULED') && (
                          <button
                            type="button"
                            onClick={() => handleRetryJob(item.id)}
                            className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold text-[11px] hover:bg-cyan-500/30 transition inline-flex items-center gap-1"
                          >
                            <RotateCcw className="h-3 w-3" /> Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
