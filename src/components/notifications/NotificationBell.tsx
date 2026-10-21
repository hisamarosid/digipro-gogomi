'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  ShoppingBag,
  CreditCard,
  Package,
  RefreshCw,
  Coins,
  Shield,
  LifeBuoy,
  Tag,
  Gift,
  TrendingDown,
  Activity,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationBellProps {
  userType?: 'customer' | 'admin';
}

export function NotificationBell({ userType = 'customer' }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const apiEndpoint = userType === 'admin' ? '/api/admin/notifications' : '/api/account/notifications';
  const unreadEndpoint = userType === 'admin' ? '/api/admin/notifications/unread-count' : '/api/account/notifications/unread-count';
  const fullPageUrl = userType === 'admin' ? '/admin/notifications' : '/account/notifications';

  const fetchUnreadCount = async () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }
    try {
      const res = await fetch(unreadEndpoint);
      const json = await res.json();
      if (res.ok && json.success) {
        setUnreadCount(json.count || 0);
      }
    } catch {
      // Silent catch for background polling
    }
  };

  const fetchRecent = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiEndpoint}?limit=5&unreadOnly=true`);
      const json = await res.json();
      if (res.ok && json.success) {
        setRecentNotifications(json.data.items || []);
      }
    } catch {
      toast.error('Gagal memuat notifikasi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // 60s idle polling

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [unreadEndpoint]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchRecent();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(apiEndpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READ' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Semua notifikasi ditandai dibaca');
        setUnreadCount(0);
        setRecentNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date() })));
      }
    } catch {
      toast.error('Gagal memperbarui status notifikasi');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ORDER':
        return <ShoppingBag className="h-4 w-4 text-blue-400" />;
      case 'PAYMENT':
        return <CreditCard className="h-4 w-4 text-violet-400" />;
      case 'PRODUCT':
      case 'FULFILLMENT':
      case 'INVENTORY':
        return <Package className="h-4 w-4 text-cyan-400" />;
      case 'REPLACEMENT':
        return <RefreshCw className="h-4 w-4 text-emerald-400" />;
      case 'COIN':
      case 'LOYALTY':
        return <Coins className="h-4 w-4 text-amber-400" />;
      case 'SECURITY':
      case 'SYSTEM':
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

  const getRelativeTime = (dateStr: string) => {
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hari lalu`;
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifikasi Web"
        className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition focus:outline-none"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center animate-pulse border border-slate-950 shadow-lg">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 sm:hidden animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-x-3 top-16 max-w-sm mx-auto sm:inset-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-96 rounded-3xl glass-panel border border-slate-800 bg-slate-900/98 shadow-2xl z-50 overflow-hidden space-y-0 text-xs animate-in fade-in zoom-in-95 sm:slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-cyan-400" />
                <span className="font-bold text-white text-sm">Notifikasi In-App</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">
                    {unreadCount} Baru
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition font-medium"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Tandai dibaca</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  aria-label="Tutup Notifikasi"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {isLoading ? (
              <div className="p-6 text-center text-slate-400 space-y-2">
                <div className="animate-spin h-5 w-5 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto" />
                <span>Memuat notifikasi...</span>
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Bell className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="font-bold text-white">Belum Ada Notifikasi Baru</p>
                <p className="text-[11px] text-slate-400">
                  Update transaksi dan aktivitas penting akun Anda akan muncul di sini.
                </p>
              </div>
            ) : (
              recentNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 transition flex gap-3 ${
                    !n.readAt ? 'bg-slate-900/90 hover:bg-slate-800/60' : 'bg-slate-950/40 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="mt-0.5 h-8 w-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                    {getCategoryIcon(n.category)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-white text-xs truncate">{n.title}</h4>
                      <span className="text-[10px] text-slate-400 shrink-0">{getRelativeTime(n.createdAt)}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] line-clamp-2 leading-relaxed">{n.message}</p>
                    {n.actionUrl && (
                      <Link
                        href={n.actionUrl}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 pt-1 transition"
                      >
                        <span>Buka Detail</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-center">
            <Link
              href={fullPageUrl}
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition inline-flex items-center gap-1"
            >
              <span>Lihat Semua Notifikasi</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
