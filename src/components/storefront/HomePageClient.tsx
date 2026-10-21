'use client';

import React from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/storefront/ProductCard';
import { useLanguage } from '@/context/LanguageContext';
import {
  Sparkles,
  ArrowRight,
  Star,
  LayoutGrid,
  Award,
  Flame,
} from 'lucide-react';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

interface HomePageClientProps {
  categories: any[];
  featuredProducts: any[];
  bestSellers: any[];
}

export function HomePageClient({
  categories,
  featuredProducts,
  bestSellers,
}: HomePageClientProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-16 pb-16">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 md:pt-16 md:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/30 via-slate-950 to-slate-950 -z-10" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-xs font-semibold text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t('hero_badge')}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            {t('hero_title_1')} <br />
            <span className="text-gradient">{t('hero_title_2')}</span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            {t('hero_desc')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/products"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-xl shadow-emerald-500/20 hover:opacity-95 transition"
            >
              <span>{t('hero_cta')}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Bar */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-emerald-400" />
            <span>{t('cat_title')}</span>
          </h2>
          <Link href="/products" className="text-xs font-semibold text-emerald-400 hover:underline">
            {t('cat_all')}
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="group flex items-center gap-3 p-3 rounded-2xl glass-panel border border-slate-800/80 bg-slate-900/40 hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform shrink-0">
                <CategoryIcon name={cat.icon} className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xs font-bold text-white group-hover:text-emerald-400 truncate">{cat.name}</h3>
                <p className="text-[10px] text-slate-400 truncate">{t('cat_subtitle')}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Top Charts Section (4 Columns Grid) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Flame className="h-5 w-5 text-rose-400" />
              <span>{t('top_charts_title')}</span>
            </h2>
            <p className="text-xs text-slate-400">{t('top_charts_desc')}</p>
          </div>
          <Link href="/products?sort=popular" className="text-xs font-semibold text-emerald-400 hover:underline">
            {t('cat_all')}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Featured Section (4 Columns Grid) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-cyan-400" />
              <span>{t('featured_title')}</span>
            </h2>
            <p className="text-xs text-slate-400">{t('featured_desc')}</p>
          </div>
          <Link href="/products" className="text-xs font-semibold text-emerald-400 hover:underline">
            {t('cat_all')}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Reviews & Social Proof */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 glass-panel rounded-3xl border border-slate-800/80 bg-slate-900/40">
        <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
          <div className="flex justify-center gap-1 text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-amber-400" />
            ))}
          </div>
          <h2 className="text-xl font-bold text-white">{t('reviews_title')}</h2>
          <p className="text-xs text-slate-400">{t('reviews_subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
            <p className="text-slate-300 italic">"Mantap seperti PlayStore! Tampilan aplikasinya keren, abis bayar QRIS lisensi langsung aktif dalam hitungan detik."</p>
            <p className="font-bold text-white">— Rizky P., Software Developer</p>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
            <p className="text-slate-300 italic">"Canva Pro nya langsung aktif di email pribadi saya. Sistem garansinya terjamin. Sangat direkomendasikan!"</p>
            <p className="font-bold text-white">— Anita W., Content Creator</p>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
            <p className="text-slate-300 italic">"Lisensi JetBrains resmi bekerja 100%. Pembayaran QRIS sangat mudah tanpa konfirmasi manual."</p>
            <p className="font-bold text-white">— Hendra K., Backend Engineer</p>
          </div>
        </div>
      </section>

    </div>
  );
}
