'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Trash2,
  ChevronRight,
  ShoppingBag,
  CreditCard,
  Package,
  RefreshCw,
  Coins,
  Shield,
  LifeBuoy,
  Gift,
  TrendingDown,
  RefreshCcw,
} from 'lucide-react';
import { toast } from 'sonner';

interface CustomerNotificationsClientProps {
  initialNotifications: any[];
  initialTotalPages: number;
  initialUnreadCount: number;
  userRole?: string | null;
}

export function CustomerNotificationsClient({
  initialNotifications,
  initialTotalPages,
  initialUnreadCount,
  userRole,
}: CustomerNotificationsClientProps) {
  const [notifications, setNotifications] = useState<any[]>(initialNotifications || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages || 1);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount || 0);

  const fetchNotifications = async (targetTab = activeTab, targetPage = page) => {
    setIsLoading(true);
    setIsError(false);
    try {
      let url = `/api/account/notifications?page=${targetPage}&limit=15`;
      if (targetTab === 'unread') {
        url += '&unreadOnly=true';
      } else if (targetTab !== 'all') {
        url += `&category=${targetTab}`;
      }

      const res = await fetch(url);
      const json = await res.json();

      if (res.ok && json.success) {
        setNotifications(json.data.items || []);
        setTotalPages(json.data.totalPages || 1);
        setUnreadCount(json.data.unreadCount || 0);
      } else {
        setIsError(true);
      }
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setPage(1);
    fetchNotifications(newTab, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchNotifications(activeTab, newPage);
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/account/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READ' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Semua notifikasi ditandai dibaca');
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date() })));
      }
    } catch {
      toast.error('Gagal memperbarui notifikasi');
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    try {
      const res = await fetch('/api/account/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READ', notificationId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, readAt: new Date() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      toast.error('Gagal memperbarui notifikasi');
    }
  };

  const handleDismiss = async (notificationId: string) => {
    try {
      const res = await fetch('/api/account/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DISMISS', notificationId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Notifikasi disembunyikan');
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }
    } catch {
      toast.error('Gagal menyembunyikan notifikasi');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ORDER':
        return <ShoppingBag className="h-4 w-4 text-blue-400" />;
      case 'PAYMENT':
        return <CreditCard className="h-4 w-4 text-violet-400" />;
      case 'PRODUCT':
        return <Package className="h-4 w-4 text-cyan-400" />;
      case 'REPLACEMENT':
        return <RefreshCw className="h-4 w-4 text-emerald-400" />;
      case 'COIN':
        return <Coins className="h-4 w-4 text-amber-400" />;
      case 'SECURITY':
        return <Shield className="h-4 w-4 text-rose-400" />;
      case 'SUPPORT':
        return <LifeBuoy className="h-4 w-4 text-pink-400" />;
      case 'REFERRAL':
        return <Gift className="h-4 w-4 text-indigo-400" />;
      case 'PRICE_ALERT':
        return <TrendingDown className="h-4 w-4 text-amber-400" />;
      default:
        return <Bell className="h-4 w-4 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Bell className="h-7 w-7 text-cyan-400" />
            <span>Pusat Notifikasi Member</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Informasi real-time seputar pesanan, transaksi, garansi replacement, koin, dan keamanan akun Anda.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-1.5"
          >
            <CheckCheck className="h-4 w-4 text-cyan-400" />
            <span>Tandai Semua Dibaca</span>
          </button>
        )}
      </div>

      {/* Admin Notice Banner if Admin */}
      {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <p className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>🛡️ Anda Login Sebagai Administrator</span>
            </p>
            <p className="text-slate-300 text-[11px]">
              Halaman ini menampilkan notifikasi akun member. Notifikasi operasional toko (stok habis, pembayaran, garansi supplier, dll) tersedia di Pusat Notifikasi Admin.
            </p>
          </div>
          <Link
            href="/admin/notifications"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition shrink-0 text-center shadow-md shadow-amber-500/20"
          >
            Buka Pusat Notifikasi Admin &rarr;
          </Link>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
        <button
          type="button"
          onClick={() => handleTabChange('all')}
          className={`px-4 py-2 rounded-xl font-bold transition shrink-0 ${
            activeTab === 'all'
              ? 'bg-cyan-500 text-slate-950 shadow-lg'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          Semua Notifikasi
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('unread')}
          className={`px-4 py-2 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 ${
            activeTab === 'unread'
              ? 'bg-cyan-500 text-slate-950 shadow-lg'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <span>Belum Dibaca</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('ORDER')}
          className={`px-3.5 py-2 rounded-xl font-medium transition shrink-0 ${
            activeTab === 'ORDER' ? 'bg-blue-500 text-white font-bold' : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Pesanan
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('REPLACEMENT')}
          className={`px-3.5 py-2 rounded-xl font-medium transition shrink-0 ${
            activeTab === 'REPLACEMENT' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Replacement
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('SUBSCRIPTION')}
          className={`px-3.5 py-2 rounded-xl font-medium transition shrink-0 ${
            activeTab === 'SUBSCRIPTION' ? 'bg-indigo-500 text-white font-bold' : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Langganan & Renewal
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('COIN')}
          className={`px-3.5 py-2 rounded-xl font-medium transition shrink-0 ${
            activeTab === 'COIN' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Coins & Loyalty
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('SUPPORT')}
          className={`px-3.5 py-2 rounded-xl font-medium transition shrink-0 ${
            activeTab === 'SUPPORT' ? 'bg-pink-500 text-white font-bold' : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Support
        </button>
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 animate-pulse flex gap-4">
              <div className="h-10 w-10 rounded-xl bg-slate-800 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/3 bg-slate-800 rounded" />
                <div className="h-3 w-2/3 bg-slate-800/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-12 text-center space-y-4">
          <p className="text-slate-300 font-bold text-sm">Notifikasi belum dapat dimuat saat ini.</p>
          <button
            type="button"
            onClick={() => fetchNotifications()}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition inline-flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            <span>Coba Lagi</span>
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-12 text-center space-y-3">
          <Bell className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">Belum Ada Notifikasi</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Update penting tentang pesanan, akses lisensi, garansi replacement, dan bonus Store Coins Anda akan muncul di halaman ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`p-4 md:p-5 rounded-2xl glass-panel border transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg ${
                !item.readAt
                  ? 'bg-slate-900/90 border-cyan-500/30'
                  : 'bg-slate-900/40 border-slate-800/80 text-slate-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 h-10 w-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                  {getCategoryIcon(item.category)}
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    {!item.readAt && (
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                    )}
                    <h3 className="font-bold text-sm text-white">{item.title}</h3>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed">{item.message}</p>

                  <span className="inline-block text-[10px] text-slate-500">
                    {new Date(item.createdAt).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80 justify-end">
                {!item.readAt && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(item.id)}
                    className="px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition text-[11px] font-medium"
                  >
                    Tandai Dibaca
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDismiss(item.id)}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                  title="Sembunyikan"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                {item.actionUrl && (
                  <Link
                    href={item.actionUrl}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-1 shrink-0"
                  >
                    <span>Buka Link</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="text-xs text-slate-400 font-medium">
            Halaman {page} dari {totalPages}
          </span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40"
          >
            Selanjutnya
          </button>
        </div>
      )}
    </div>
  );
}

