'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import { ShoppingBag, Key, RefreshCw, Coins, ArrowRight } from 'lucide-react';

interface CustomerDashboardClientProps {
  sessionName: string;
  ordersCount: number;
  activeProductsCount: number;
  subscriptionsCount: number;
  coinBalance: {
    availableCoins: number;
    currencyEquivalent: number;
  };
  recentOrders: any[];
}

export function CustomerDashboardClient({
  sessionName,
  ordersCount,
  activeProductsCount,
  subscriptionsCount,
  coinBalance,
  recentOrders,
}: CustomerDashboardClientProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white">
          {t('acc_dash_welcome')} {sessionName}!
        </h1>
        <p className="text-xs text-slate-400">{t('acc_dash_subtitle')}</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{t('acc_dash_stat_orders')}</span>
            <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white">{ordersCount}</p>
        </div>

        <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{t('acc_nav_products')}</span>
            <Key className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white">{activeProductsCount}</p>
        </div>

        <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{t('acc_dash_stat_subs')}</span>
            <RefreshCw className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-white">{subscriptionsCount}</p>
        </div>

        {/* MY COINS CARD */}
        <Link
          href="/account/coins"
          className="rounded-2xl glass-panel border border-amber-500/30 bg-slate-900/60 p-4 space-y-1 hover:border-amber-500 transition group block"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold text-amber-400">{t('acc_nav_coins')}</span>
            <Coins className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white group-hover:text-amber-400 transition font-mono">
            {coinBalance.availableCoins.toLocaleString()}
          </p>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-amber-400 font-semibold">Worth {formatIDR(coinBalance.currencyEquivalent)}</span>
            <span className="text-slate-400 group-hover:translate-x-0.5 transition">&rarr;</span>
          </div>
        </Link>
      </div>

      {/* Recent Orders List */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-white">{t('acc_dash_recent_orders')}</h3>
          <Link href="/account/orders" className="text-xs text-blue-600 dark:text-cyan-400 font-semibold hover:underline flex items-center gap-1">
            <span>{t('acc_dash_view_all_orders')}</span>
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-xs text-slate-500">{t('acc_dash_no_orders_desc')}</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
            >
              <span>{t('acc_dash_browse_btn')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((ord) => (
              <div key={ord.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                <div>
                  <p className="font-bold text-white font-mono">{ord.orderNumber}</p>
                  <p className="text-[10px] text-slate-400">{formatDateJakarta(ord.createdAt)}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-blue-600 dark:text-cyan-400">{formatIDR(ord.grandTotal)}</span>
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">{ord.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
