'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Settings, MessageCircle, ArrowRight } from 'lucide-react';
import { formatIDR } from '@/lib/utils/formatters';
import { useSupportWhatsapp } from '@/lib/hooks/useSupportWhatsapp';
import { buildWhatsappLink } from '@/lib/utils/whatsapp';

interface ServiceVariant {
  name: string;
  price: number;
  compareAtPrice?: number | null;
  unitLabel?: string | null;
  quotaRemaining?: number | null;
}

export interface ServiceCardProduct {
  name: string;
  slug: string;
  thumbnail?: string | null;
  gallery?: unknown;
  soldCount?: number;
  etaLabel?: string | null;
  category?: { name: string; slug: string } | null;
  variants: ServiceVariant[];
}

/** Share of slots still open, from what is left and what has already been sold (0-100). */
export function quotaBarPercent(remaining: number, sold: number): number {
  if (remaining <= 0) return 0;
  const taken = Math.max(0, sold);
  return Math.max(8, Math.min(100, Math.round((remaining / (remaining + taken)) * 100)));
}

export function ServiceCard({ product }: { product: ServiceCardProduct }) {
  const supportWhatsapp = useSupportWhatsapp();
  const variant = product.variants[0];
  if (!variant) return null;

  const banner =
    (Array.isArray(product.gallery) && typeof product.gallery[0] === 'string' && product.gallery[0]) || product.thumbnail || null;

  const hasDiscount = !!variant.compareAtPrice && variant.compareAtPrice > variant.price;
  const discountPercent = hasDiscount
    ? Math.round(((variant.compareAtPrice! - variant.price) / variant.compareAtPrice!) * 100)
    : null;

  const sold = product.soldCount || 0;
  const hasQuota = typeof variant.quotaRemaining === 'number';
  const remaining = hasQuota ? (variant.quotaRemaining as number) : null;
  const isFull = remaining === 0;

  const waLink = buildWhatsappLink(
    supportWhatsapp,
    `Halo admin Gogomi, saya mau ${isFull ? 'tanya jadwal untuk' : 'pesan'} *${product.name}* (mulai ${formatIDR(variant.price)}). Mohon info detail dan caranya.\n${
      typeof window !== 'undefined' ? window.location.origin : ''
    }/products/${product.slug}`
  );

  return (
    <div className="group relative flex flex-col rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/60 p-3 hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20 transition-all duration-300">
      {/* Banner with estimated time */}
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden rounded-2xl bg-slate-950 border border-slate-800/80 aspect-[16/9]">
        {banner ? (
          <img src={banner} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-black text-slate-700">{product.name.charAt(0)}</div>
        )}
        {product.etaLabel && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-slate-950/85 border border-cyan-500/30 px-2.5 py-1 text-[11px] font-bold text-cyan-300 backdrop-blur">
            <Clock className="h-3 w-3" />
            {product.etaLabel}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 px-1.5 pt-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <Settings className="h-3 w-3" />
          {product.category?.name || 'Jasa Digital'}
        </span>

        <Link href={`/products/${product.slug}`}>
          <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug line-clamp-2 group-hover:text-cyan-400 transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="space-y-0.5 pt-1">
          {hasDiscount && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 line-through">{formatIDR(variant.compareAtPrice!)}</span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                Hemat {discountPercent}%
              </span>
            </div>
          )}
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-white">{formatIDR(variant.price)}</span>
            {variant.unitLabel && <span className="text-xs text-slate-400">/ {variant.unitLabel}</span>}
          </div>
        </div>

        {(sold > 0 || hasQuota) && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              {sold > 0 && <span className="text-amber-400">{sold} terjual</span>}
              {sold > 0 && hasQuota && <span className="text-slate-600">·</span>}
              {hasQuota && <span className={isFull ? 'text-rose-400' : 'text-rose-300'}>{isFull ? 'Slot penuh' : `Sisa ${remaining}`}</span>}
            </div>
            {hasQuota && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-rose-500" style={{ width: `${quotaBarPercent(remaining as number, sold)}%` }} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        {waLink ? (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 text-white py-2.5 text-xs font-bold transition shadow-md shadow-green-600/20"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{isFull ? 'Tanya Jadwal via WA' : 'Pesan via WA'}</span>
          </a>
        ) : (
          <Link
            href={`/products/${product.slug}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-2.5 text-xs font-bold transition"
          >
            <span>Lihat Detail</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
