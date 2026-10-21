import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db/prisma';
import { Sparkles, ArrowRight, Package, Grid3X3 } from 'lucide-react';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    where: { active: true },
    include: {
      _count: {
        select: { products: { where: { status: 'ACTIVE' } } },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/60 p-6 sm:p-8 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Kategori Produk Digital</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Jelajahi Berdasarkan Kategori
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
          Temukan akun AI, lisensi software, aplikasi produktivitas, dan alat desain terlengkap dengan garansi resmi dan pengiriman instan.
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {categories.map((cat) => {
          const productCount = cat._count.products;
          return (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="group relative flex flex-col justify-between p-6 rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/60 hover:border-cyan-500/40 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                    <CategoryIcon name={cat.icon} className="h-6 w-6 text-cyan-400" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[11px] font-bold text-slate-300">
                    <Package className="h-3 w-3 text-cyan-400" />
                    <span>{productCount} Produk</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {cat.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
                <span>Lihat Katalog Produk</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
