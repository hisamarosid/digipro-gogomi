'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Search,
  User,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  Home,
  Package,
  Layers,
  LifeBuoy,
  MessageCircle,
  ChevronRight,
  Coins,
  LayoutDashboard,
  ChevronDown,
  Bell,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { LivePurchaseTicker } from '@/components/storefront/LivePurchaseTicker';
import { SiteSettingsData } from '@/services/siteSetting.service';

interface HeaderProps {
  userSession?: { name: string; email?: string; role: string } | null;
  featureFlags?: Record<string, boolean>;
  siteSettings?: SiteSettingsData | null;
}

export function Header({ userSession, featureFlags, siteSettings }: HeaderProps) {
  const router = useRouter();
  const { items, setIsOpen } = useCart();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  const cartCount = items.reduce((acc, i) => acc + i.quantity, 0);

  const logoUrl =
    (siteSettings?.STORE_LOGO_URL && siteSettings.STORE_LOGO_URL.trim() !== '')
      ? siteSettings.STORE_LOGO_URL
      : (siteSettings?.STORE_ICON_URL && siteSettings.STORE_ICON_URL.trim() !== '')
      ? siteSettings.STORE_ICON_URL
      : '/gogomi-logo.png';
  const storeName = siteSettings?.STORE_NAME || 'Gogomi Store';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setMobileMenuOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      {/* Announcement Bar Header Banner */}
      {siteSettings?.ANNOUNCEMENT_ACTIVE === 'true' && !announcementDismissed && siteSettings.ANNOUNCEMENT_TEXT && (
        <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white text-xs py-1.5 px-4 sticky top-0 z-50 flex items-center justify-between shadow-md">
          <div className="mx-auto flex items-center gap-2 text-center font-medium">
            <span>{siteSettings.ANNOUNCEMENT_TEXT}</span>
            {siteSettings.ANNOUNCEMENT_LINK && (
              <Link
                href={siteSettings.ANNOUNCEMENT_LINK}
                className="underline font-bold hover:text-cyan-200 transition inline-flex items-center gap-0.5"
              >
                Lihat Promo &rarr;
              </Link>
            )}
          </div>
          <button
            onClick={() => setAnnouncementDismissed(true)}
            className="text-white/80 hover:text-white p-0.5 rounded transition shrink-0"
            aria-label="Tutup Pengumuman"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl text-white group shrink-0 mr-4">
            <img
              src={logoUrl}
              alt={storeName}
              className="h-8 sm:h-9 w-auto max-w-[140px] object-contain group-hover:scale-105 transition-transform"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/gogomi-logo.png';
              }}
            />
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-white whitespace-nowrap">
              {storeName}
            </span>
          </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 whitespace-nowrap text-sm font-medium text-slate-300">
          <Link href="/products" className="hover:text-blue-400 transition-colors">
            {t('nav_products')}
          </Link>
          <Link href="/categories" className="hover:text-blue-400 transition-colors">
            {t('nav_categories')}
          </Link>
          <Link href="/products?category=jasa-digital" className="hidden lg:inline hover:text-blue-400 transition-colors">
            Jasa Digital
          </Link>
          <Link href="/products?deals=true" className="hover:text-blue-400 transition-colors flex items-center gap-1 whitespace-nowrap text-blue-400 font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> {t('nav_deals')}
          </Link>
        </nav>

        {/* Desktop Search Input */}
        <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center relative w-64">
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full bg-slate-900 border border-slate-800 py-1.5 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
          />
          <Search className="absolute left-3 h-3.5 w-3.5 text-slate-500" />
        </form>

        {/* Actions (Language Switcher, Theme Toggle, Cart & Auth & Hamburger) */}
        <div className="flex items-center gap-1.5 sm:gap-2">

          {/* Language Switcher Button (Desktop & Tablet only to prevent mobile overflow) */}
          <div className="hidden xl:block">
            <LanguageSwitcher />
          </div>

          {/* Dark / Light Theme Toggle (Desktop & Tablet only) */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {/* Cart Button */}
          <button
            onClick={() => setIsOpen(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:border-slate-700 hover:text-white transition shrink-0"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-md">
                {cartCount}
              </span>
            )}
          </button>

          {/* Notification Bell (Dynamic: Admin for Admin/SuperAdmin, Customer for Customers) */}
          {userSession && (
            <NotificationBell
              userType={userSession.role === 'SUPER_ADMIN' || userSession.role === 'ADMIN' ? 'admin' : 'customer'}
            />
          )}

          {/* Account / Login */}
          {userSession ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 rounded-full bg-slate-900 border border-slate-800 p-1 pr-2.5 hover:border-slate-700 transition"
              >
                <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                  {userSession.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-white hidden sm:inline">{userSession.name.split(' ')[0]}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel border border-slate-800 bg-slate-900/95 p-2 shadow-2xl space-y-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-800/80">
                    <p className="font-bold text-white truncate">{userSession.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{userSession.email}</p>
                  </div>

                  <Link
                    href="/account/coins"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800 text-amber-400 font-bold transition"
                  >
                    <span className="flex items-center gap-2">
                      <Coins className="h-4 w-4" /> My Store Coins
                    </span>
                    <span className="text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Cek Koin</span>
                  </Link>

                  <Link
                    href={userSession.role !== 'CUSTOMER' ? '/admin' : '/account'}
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 font-bold transition"
                  >
                    <LayoutDashboard className="h-4 w-4 text-cyan-400" />
                    <span>{userSession.role !== 'CUSTOMER' ? 'Admin Dashboard' : 'Dashboard Akun'}</span>
                  </Link>

                  <div className="pt-1 border-t border-slate-800/80">
                    <LogoutButton variant="sidebar" className="w-full text-center" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 text-xs font-bold shadow-md shadow-blue-500/20 transition shrink-0"
            >
              <User className="h-3.5 w-3.5" />
              <span>Masuk</span>
            </Link>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white transition shrink-0"
            aria-label="Menu Mobile"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <LivePurchaseTicker />

      {/* Mobile Slide Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-xl px-4 py-5 space-y-5 animate-in slide-in-from-top-2 duration-200 max-h-[85vh] overflow-y-auto">

          {/* User Account Info Card in Mobile Menu if Logged In */}
          {userSession && (
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold flex items-center justify-center text-xs shrink-0">
                    {userSession.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{userSession.name}</p>
                    <p className="text-[10px] text-blue-400 font-semibold uppercase">{userSession.role}</p>
                  </div>
                </div>
                <Link
                  href="/account/coins"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-400"
                >
                  <Coins className="h-3.5 w-3.5" />
                  <span>My Coins</span>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 text-xs">
                <Link
                  href={userSession.role !== 'CUSTOMER' ? '/admin' : '/account'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-bold hover:text-white"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 text-blue-400" />
                  <span>{userSession.role !== 'CUSTOMER' ? 'Admin Panel' : 'Dashboard'}</span>
                </Link>
                <Link
                  href="/account/products"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-bold hover:text-white"
                >
                  <Package className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Lisensi Saya</span>
                </Link>
              </div>
            </div>
          )}

          {/* Mobile Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 py-2.5 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          </form>

          {/* Primary Nav Links & Preferences */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Preferences & Theme</span>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs font-bold text-slate-200 hover:text-blue-400 transition"
              >
                <Home className="h-4 w-4 text-blue-400" />
                <span>{t('nav_home')}</span>
              </Link>
              <Link
                href="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs font-bold text-slate-200 hover:text-cyan-400 transition"
              >
                <Package className="h-4 w-4 text-cyan-400" />
                <span>{t('nav_all_products')}</span>
              </Link>
            </div>
          </div>

          {/* Popular Categories */}
          <div className="space-y-1.5 pt-2 border-t border-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{t('cat_title')}</span>
              <Link href="/categories" onClick={() => setMobileMenuOpen(false)} className="text-[11px] font-bold text-cyan-400 hover:underline">
                Lihat Semua &rarr;
              </Link>
            </div>
            <div className="space-y-1 text-xs font-medium text-slate-300">
              <Link href="/products?category=design-creative" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between py-2 px-1 hover:text-cyan-400 transition">
                <span>🎨 Design & Creative (Adobe, Canva)</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              </Link>
              <Link href="/products?category=ai-productivity" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between py-2 px-1 hover:text-cyan-400 transition">
                <span>🤖 AI & Productivity (ChatGPT, Claude)</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              </Link>
              <Link href="/products?category=ai-developer-tools" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between py-2 px-1 hover:text-cyan-400 transition">
                <span>💻 AI & Dev Tools (Antigravity)</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              </Link>
              <Link href="/products?category=streaming-entertainment" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between py-2 px-1 hover:text-cyan-400 transition">
                <span>🎬 Streaming (Netflix, Spotify)</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              </Link>
              <Link href="/products?category=social-media-accounts" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between py-2 px-1 hover:text-cyan-400 transition">
                <span>📱 Social Media (TikTok, IG)</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              </Link>
            </div>
          </div>

          {/* Support & Legal Links */}
          <div className="space-y-1.5 pt-2 border-t border-slate-900">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{t('footer_help_policy')}</span>
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <Link
                href="/account/support"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-bold"
              >
                <LifeBuoy className="h-3.5 w-3.5 text-rose-400" />
                <span>{t('nav_support')}</span>
              </Link>
              <a
                href="https://t.me/gogomistore"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 font-bold"
              >
                <MessageCircle className="h-3.5 w-3.5 text-sky-400" />
                <span>Telegram</span>
              </a>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3 text-[11px] text-slate-400 font-medium border-t border-slate-900">
              <Link href="/terms" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 transition">
                {t('footer_terms')}
              </Link>
              <Link href="/privacy" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 transition">
                {t('footer_privacy')}
              </Link>
              <Link href="/refund-policy" onClick={() => setMobileMenuOpen(false)} className="hover:text-cyan-400 transition">
                {t('footer_refund')}
              </Link>
            </div>
          </div>

        </div>
      )}
    </header>
    </>
  );
}
