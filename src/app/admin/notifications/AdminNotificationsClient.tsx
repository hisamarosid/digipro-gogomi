'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Info,
  ExternalLink,
  RefreshCw,
  Trash2,
  Loader2,
  CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateJakarta } from '@/lib/utils/formatters';

export function AdminNotificationsClient() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications');
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data);
        setUnreadCount(json.unreadCount);
      }
    } catch {
      toast.error('Gagal memuat notifikasi admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_ALL_READ' }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Semua notifikasi ditandai dibaca');
        fetchNotifications();
      }
    } catch {
      toast.error('Gagal memperbarui notifikasi');
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READ', notificationId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchNotifications();
      }
    } catch {
      toast.error('Gagal menandai notifikasi');
    }
  };

  const handleDismiss = async (notificationId: string) => {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DISMISS', notificationId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Notifikasi di-dismiss');
        fetchNotifications();
      }
    } catch {
      toast.error('Gagal dismiss notifikasi');
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-extrabold text-[10px] animate-pulse">CRITICAL</span>;
      case 'HIGH':
        return <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold text-[10px]">HIGH</span>;
      case 'WARNING':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold text-[10px]">WARNING</span>;
      case 'INFO':
      default:
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold text-[10px]">INFO</span>;
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.readAt;
    if (filter === 'CRITICAL') return n.severity === 'CRITICAL' || n.severity === 'HIGH';
    return true;
  });

  const criticalCount = notifications.filter((n) => n.severity === 'CRITICAL' || n.severity === 'HIGH').length;

  return (
    <div className="space-y-6 text-xs">
      
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Bell className="h-3.5 w-3.5" />
              <span>Real-Time Operational Alerts</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Pusat Notifikasi &amp; Alert Operasional
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Pusat monitoring operasional terpusat: alert stok habis, pembatalan pembayaran, krisis master shared, dan kegagalan fulfillment.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 font-bold disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4 text-cyan-400" />
              <span>Tandai Semua Dibaca</span>
            </button>

            <button
              type="button"
              onClick={fetchNotifications}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition font-bold shadow-lg shadow-cyan-500/20"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Notifikasi</p>
          <p className="text-2xl font-black text-white">{notifications.length}</p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Belum Dibaca</p>
          <p className="text-2xl font-black text-cyan-300">{unreadCount}</p>
        </div>

        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Alert Kritis / High</p>
          <p className="text-2xl font-black text-rose-300">{criticalCount}</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Sistem Status</p>
          <p className="text-2xl font-black text-emerald-300">Live</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-3 rounded-t-2xl font-bold text-xs transition border-b-2 ${
            filter === 'ALL'
              ? 'bg-slate-900 border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'
          }`}
        >
          Semua Notifikasi ({notifications.length})
        </button>

        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-4 py-3 rounded-t-2xl font-bold text-xs transition border-b-2 ${
            filter === 'UNREAD'
              ? 'bg-slate-900 border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'
          }`}
        >
          Belum Dibaca ({unreadCount})
        </button>

        <button
          onClick={() => setFilter('CRITICAL')}
          className={`px-4 py-3 rounded-t-2xl font-bold text-xs transition border-b-2 ${
            filter === 'CRITICAL'
              ? 'bg-slate-900 border-rose-400 text-rose-300'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'
          }`}
        >
          Kritis &amp; Tinggi ({criticalCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-cyan-400" />
            Memuat notifikasi admin...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 glass-panel border border-slate-800 rounded-3xl p-6">
            Tidak ada notifikasi ditemukan.
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.recipientId || n.id}
              className={`p-4 rounded-3xl border transition space-y-2 glass-panel ${
                !n.readAt
                  ? 'bg-slate-900/90 border-cyan-500/30 shadow-lg shadow-cyan-950/20'
                  : 'bg-slate-950/60 border-slate-800/80 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(n.severity)}
                    <span className="font-bold text-white text-sm">{n.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{formatDateJakarta(n.createdAt)}</span>
                  </div>
                  <p className="text-slate-300 text-xs">{n.message}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {n.actionUrl && (
                    <Link
                      href={n.actionUrl}
                      onClick={() => handleMarkRead(n.id)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center gap-1 text-xs shadow-md shadow-cyan-600/20"
                    >
                      <span>Buka Aksi</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}

                  {!n.readAt && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-400 transition"
                      title="Tandai Dibaca"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDismiss(n.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 transition"
                    title="Dismiss Notifikasi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
