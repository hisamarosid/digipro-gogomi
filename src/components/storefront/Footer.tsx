'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck, Zap, Headphones, Lock, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { SiteSettingsData } from '@/services/siteSetting.service';

interface FooterProps {
  siteSettings?: SiteSettingsData | null;
}

export function Footer({ siteSettings }: FooterProps) {
  const { t } = useLanguage();

  const logoUrl =
    (siteSettings?.STORE_LOGO_URL && siteSettings.STORE_LOGO_URL.trim() !== '')
      ? siteSettings.STORE_LOGO_URL
      : (siteSettings?.STORE_ICON_URL && siteSettings.STORE_ICON_URL.trim() !== '')
      ? siteSettings.STORE_ICON_URL
      : '/gogomi-logo.png';
  const storeName = siteSettings?.STORE_NAME || 'Gogomi Store';
  const storeTagline = siteSettings?.STORE_TAGLINE || t('footer_brand_desc');
  const supportEmail = siteSettings?.SUPPORT_EMAIL || 'support@gogomi.store';
  const supportTelegram = siteSettings?.SUPPORT_TELEGRAM || '@gogomistore';
  const telegramClean = supportTelegram.replace(/^@/, '');

  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-400 text-sm">

      {/* Value Proposition Bar (Desktop & Tablet) */}
      <div className="border-b border-slate-800/60 py-8 bg-slate-900/80 hidden md:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs sm:text-sm">{t('val_instant_title')}</h4>
              <p className="text-xs text-slate-400">{t('val_instant_desc')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs sm:text-sm">{t('val_qris_title')}</h4>
              <p className="text-xs text-slate-400">{t('val_qris_desc')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs sm:text-sm">{t('val_warranty_title')}</h4>
              <p className="text-xs text-slate-400">{t('val_warranty_desc')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs sm:text-sm">{t('val_support_title')}</h4>
              <p className="text-xs text-slate-400">{t('val_support_desc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Main Content Footer */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 hidden md:grid md:grid-cols-4 gap-8">
        <div className="space-y-4 md:col-span-1">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl text-white">
            <img
              src={logoUrl}
              alt={storeName}
              className="h-8 w-auto max-w-[140px] object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/gogomi-logo.png';
              }}
            />
            <span className="font-extrabold text-base tracking-tight text-white">{storeName}</span>
          </Link>
          <p className="text-xs leading-relaxed text-slate-400">
            {storeTagline}
          </p>
        </div>

        <div>
          <h4 className="font-bold text-white mb-3 text-xs uppercase tracking-wider">{t('footer_cat_popular')}</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/products?category=design-creative" className="hover:text-cyan-400 transition">Design & Creative</Link></li>
            <li><Link href="/products?category=ai-productivity" className="hover:text-cyan-400 transition">AI & Productivity</Link></li>
            <li><Link href="/products?category=ai-developer-tools" className="hover:text-cyan-400 transition">AI & Developer Tools</Link></li>
            <li><Link href="/products?category=streaming-entertainment" className="hover:text-cyan-400 transition">Streaming & Entertainment</Link></li>
            <li><Link href="/products?category=social-media-accounts" className="hover:text-cyan-400 transition">Social Media Accounts</Link></li>
            <li><Link href="/products?category=jasa-digital" className="hover:text-cyan-400 transition">Jasa Digital</Link></li>
            <li><Link href="/categories" className="text-cyan-400 font-bold hover:underline flex items-center gap-1 pt-1">Lihat Semua Kategori &rarr;</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white mb-3 text-xs uppercase tracking-wider">{t('footer_help_policy')}</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/help" className="hover:text-cyan-400 font-bold text-cyan-400 transition">Pusat Bantuan (Helpdesk)</Link></li>
            <li><Link href="/track" className="hover:text-cyan-400 transition">Lacak Pesanan</Link></li>
            <li><Link href="/faq" className="hover:text-cyan-400 transition">FAQ Pertanyaan Umum</Link></li>
            <li><Link href="/terms" className="hover:text-cyan-400 transition">{t('footer_terms')}</Link></li>
            <li><Link href="/privacy" className="hover:text-cyan-400 transition">{t('footer_privacy')}</Link></li>
            <li><Link href="/refund-policy" className="hover:text-cyan-400 transition">{t('footer_refund')}</Link></li>
            <li><a href={`https://t.me/${telegramClean}`} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition">Telegram {supportTelegram}</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white mb-3 text-xs uppercase tracking-wider">{t('footer_contact')}</h4>
          <p className="text-xs text-slate-400 mb-2">Email: {supportEmail}</p>
          <p className="text-xs text-slate-400 mb-4">Telegram: {supportTelegram}</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded bg-slate-900 border border-slate-800 px-2 py-1 text-[10px] text-slate-400">QRIS Instan</span>
            <span className="rounded bg-slate-900 border border-slate-800 px-2 py-1 text-[10px] text-slate-400">Garansi Otomatis</span>
            <span className="rounded bg-slate-900 border border-slate-800 px-2 py-1 text-[10px] text-slate-400">SSL 256-Bit</span>
          </div>
        </div>
      </div>

      {/* Desktop Bottom Bar */}
      <div className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 hidden md:block">
        <p>{t('footer_rights')}</p>
      </div>

      {/* Sleek Mobile-Friendly Compact Footer */}
      <div className="block md:hidden px-4 py-8 pb-24 text-center space-y-5 bg-slate-950">
        <div className="flex items-center justify-center gap-2">
          <img
            src={logoUrl}
            alt={storeName}
            className="h-8 w-auto max-w-[140px] object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/gogomi-logo.png';
            }}
          />
          <span className="font-extrabold text-base tracking-tight text-white">{storeName}</span>
        </div>

        <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
          {storeTagline}
        </p>

        {/* Quick Horizontal Mobile Badges */}
        <div className="flex flex-wrap justify-center gap-2 text-[10px]">
          <span className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-slate-300">
            ⚡ {t('val_qris_title')}
          </span>
          <span className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-slate-300">
            🛡️ {t('val_warranty_title')}
          </span>
          <span className="rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-slate-300">
            🎧 24/7 Support
          </span>
        </div>

        {/* Categories Quick Links Mobile */}
        <div className="flex flex-wrap justify-center gap-2 text-[11px] font-medium text-slate-400 pt-1">
          <Link href="/products?category=design-creative" className="hover:text-cyan-400">Design</Link>
          <span>•</span>
          <Link href="/products?category=ai-productivity" className="hover:text-cyan-400">AI Tools</Link>
          <span>•</span>
          <Link href="/products?category=ai-developer-tools" className="hover:text-cyan-400">Dev Tools</Link>
          <span>•</span>
          <Link href="/products?category=streaming-entertainment" className="hover:text-cyan-400">Streaming</Link>
          <span>•</span>
          <Link href="/products?category=social-media-accounts" className="hover:text-cyan-400">Sosmed</Link>
        </div>

        {/* Compact Legal Links Bar */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-slate-400 font-medium pt-1">
          <Link href="/help" className="text-cyan-400 hover:underline">Bantuan</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-cyan-400">{t('footer_privacy')}</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-cyan-400">{t('footer_terms')}</Link>
          <span>•</span>
          <Link href="/refund-policy" className="hover:text-cyan-400">{t('footer_refund')}</Link>
          <span>•</span>
          <a href={`https://t.me/${telegramClean}`} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
            Telegram
          </a>
        </div>

        <p className="text-[10px] text-slate-600 pt-2">
          {t('footer_rights')}
        </p>
      </div>

    </footer>
  );
}
