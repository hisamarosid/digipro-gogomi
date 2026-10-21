'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { LogoutButton } from '@/components/auth/LogoutButton';
import {
  LayoutDashboard,
  ShoppingBag,
  Key,
  RefreshCw,
  LifeBuoy,
  User,
  Sparkles,
  Coins,
  Bell,
  Gift,
  Clock,
  Heart,
  TrendingDown,
} from 'lucide-react';

interface AccountSidebarProps {
  session: {
    name: string;
    email: string;
  };
  flags: Record<string, boolean>;
}

export function AccountSidebar({ session, flags }: AccountSidebarProps) {
  const { t } = useLanguage();

  return (
    <aside className="md:col-span-3 rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-4 space-y-3">
      {/* Member Profile Badge Card */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-cyan-400 font-bold flex items-center justify-center text-sm shrink-0">
            {session.name ? session.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">{session.name}</p>
            <p className="text-[10px] text-blue-600 dark:text-cyan-400 truncate">{session.email}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
          <span className="text-slate-400">{t('acc_status_title')}</span>
          <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-cyan-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase">
            <Sparkles className="h-3 w-3" /> {t('acc_status_vip')}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1 text-xs font-medium text-slate-300">
        <Link href="/account" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition">
          <LayoutDashboard className="h-4 w-4 text-cyan-400" />
          <span>{t('acc_nav_dashboard')}</span>
        </Link>

        <Link href="/account/orders" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition">
          <ShoppingBag className="h-4 w-4 text-blue-400" />
          <span>{t('acc_nav_orders')}</span>
        </Link>

        <Link href="/account/products" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition">
          <Key className="h-4 w-4 text-emerald-400" />
          <span>{t('acc_nav_products')}</span>
        </Link>

        <Link href="/account/subscriptions" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition">
          <RefreshCw className="h-4 w-4 text-amber-400" />
          <span>{t('acc_nav_subscriptions')}</span>
        </Link>

        {flags.RENEWAL && (
          <Link href="/account/renewals" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition">
            <Clock className="h-4 w-4 text-blue-400" />
            <span>{t('acc_nav_renewals')}</span>
          </Link>
        )}

        {flags.WAITLIST && (
          <Link href="/account/waitlist" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition">
            <Bell className="h-4 w-4 text-cyan-400" />
            <span>{t('acc_nav_waitlist')}</span>
          </Link>
        )}

        {flags.LOYALTY_TIER && (
          <Link href="/account/loyalty" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>{t('acc_nav_loyalty')}</span>
          </Link>
        )}

        {flags.WISHLIST && (
          <Link href="/account/wishlist" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition">
            <Heart className="h-4 w-4 text-rose-500" />
            <span>{t('acc_nav_wishlist')}</span>
          </Link>
        )}

        {flags.PRICE_ALERT && (
          <Link href="/account/price-alerts" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition">
            <TrendingDown className="h-4 w-4 text-amber-400" />
            <span>{t('acc_nav_price_alerts')}</span>
          </Link>
        )}

        {flags.REFERRAL && (
          <Link href="/account/referrals" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition">
            <Gift className="h-4 w-4 text-indigo-400" />
            <span>{t('acc_nav_referrals')}</span>
          </Link>
        )}

        {flags.STORE_COINS && (
          <Link href="/account/coins" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition">
            <Coins className="h-4 w-4 text-amber-400" />
            <span>{t('acc_nav_coins')}</span>
          </Link>
        )}

        <Link href="/account/notifications" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition">
          <Bell className="h-4 w-4 text-rose-400" />
          <span>{t('acc_nav_notifications')}</span>
        </Link>

        <Link href="/account/support" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition">
          <LifeBuoy className="h-4 w-4 text-rose-500" />
          <span>{t('acc_nav_support')}</span>
        </Link>

        <Link href="/account/profile" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition">
          <User className="h-4 w-4 text-sky-400" />
          <span>{t('acc_nav_profile')}</span>
        </Link>
      </nav>

      <div className="pt-2 border-t border-slate-800/80">
        <LogoutButton variant="sidebar" />
      </div>
    </aside>
  );
}
