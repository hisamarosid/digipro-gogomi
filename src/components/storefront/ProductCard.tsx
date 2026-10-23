'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowRight, Star } from 'lucide-react';
import { formatIDR } from '@/lib/utils/formatters';
import { useLanguage } from '@/context/LanguageContext';

export interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    shortDesc: string;
    thumbnail?: string | null;
    viewCount?: number;
    soldCount?: number;
    category?: { name: string; slug: string } | null;
    featured?: boolean;
    reviews?: Array<{ rating: number }>;
    variants: Array<{
      id: string;
      name: string;
      sku: string;
      price: number;
      compareAtPrice?: number | null;
      deliveryType: string;
    }>;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useLanguage();
  const primaryVariant = product.variants[0];

  if (!primaryVariant) return null;

  const discountPercent = primaryVariant.compareAtPrice && primaryVariant.compareAtPrice > primaryVariant.price
    ? Math.round(((primaryVariant.compareAtPrice - primaryVariant.price) / primaryVariant.compareAtPrice) * 100)
    : null;

  const reviewsList = product.reviews || [];
  const reviewCount = reviewsList.length;
  const avgRating = reviewCount > 0
    ? (reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewCount).toFixed(1)
    : null;

  const views = product.viewCount || 0;
  const formattedViews = views >= 1000 ? `${(views / 1000).toFixed(1)}k` : views.toString();

  const sold = product.soldCount || 0;
  const formattedSold = sold >= 1000 ? `${(sold / 1000).toFixed(1)}k+` : sold.toString();

  return (
    <div className="group relative flex flex-col p-4 rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20 transition-all duration-300">
      
      {/* Top Section: PlayStore App Icon + Info */}
      <Link href={`/products/${product.slug}`} className="flex items-start gap-4 flex-1 min-w-0">
        {/* PlayStore App Icon (Logo) */}
        <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-slate-950 border border-slate-800/90 overflow-hidden shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300">
          {product.thumbnail ? (
            <img
              src={product.thumbnail}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-900 text-blue-600 dark:text-cyan-400 font-bold text-lg">
              {product.name.charAt(0)}
            </div>
          )}
          {discountPercent && (
            <span className="absolute bottom-0 inset-x-0 bg-rose-600/90 text-white font-extrabold text-[9px] text-center py-0.5 uppercase tracking-wider">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* PlayStore Info (Title, Category, Rating, Price, Sold Count) */}
        <div className="flex-1 min-w-0 space-y-1">
          {product.category && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400 block">
              {product.category.name}
            </span>
          )}

          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">
            {product.name}
          </h3>

          <p className="text-xs text-slate-400 line-clamp-1">
            {product.shortDesc}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {/* Rating: only shown once there is at least one real review */}
            {avgRating && (
              <>
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  <span>{avgRating}</span>
                  <span className="text-slate-500 font-normal text-[10px]">({reviewCount})</span>
                </div>

                <span className="text-slate-700">•</span>
              </>
            )}

            {/* Sold Count Badge */}
            <div className="flex items-center gap-1 text-amber-500 font-bold text-[11px]">
              <ShoppingBag className="h-3 w-3 text-amber-500" />
              <span>{formattedSold} Terjual</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {primaryVariant.compareAtPrice && primaryVariant.compareAtPrice > primaryVariant.price && (
              <span className="text-[11px] text-slate-500 line-through">
                {formatIDR(primaryVariant.compareAtPrice)}
              </span>
            )}
            <span className="text-sm font-extrabold text-white">
              {formatIDR(primaryVariant.price)}
            </span>
          </div>
        </div>
      </Link>

      {/* Bottom Section: single call to action */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <Link
          href={`/products/${product.slug}`}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-3 text-xs font-bold transition shadow-md shadow-blue-500/20 text-center"
        >
          <span>{t('get_now')}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

    </div>
  );
}
