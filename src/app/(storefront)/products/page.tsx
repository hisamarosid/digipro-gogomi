import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db/prisma';
import { ProductCard } from '@/components/storefront/ProductCard';
import { ServiceChatCard } from '@/components/storefront/ServiceChatCard';
import { Search, Filter, Sparkles, SlidersHorizontal, ArrowUpDown, X, Tag } from 'lucide-react';
import { SharedStockService } from '@/services/sharedStock.service';

export const dynamic = 'force-dynamic';

export default async function ProductsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; sort?: string; deals?: string }>;
}) {
  const { category, q, sort, deals } = await searchParams;

  const whereClause: any = {
    status: 'ACTIVE',
  };

  if (category) {
    whereClause.category = { slug: category };
  }

  if (q) {
    whereClause.OR = [
      { name: { contains: q } },
      { shortDesc: { contains: q } },
      { fullDesc: { contains: q } },
    ];
  }

  if (deals === 'true') {
    whereClause.featured = true;
  }

  let orderBy: any = { createdAt: 'desc' };
  if (sort === 'popular') {
    orderBy = { bestSeller: 'desc' };
  }

  const [rawProducts, categories] = await Promise.all([
    db.product.findMany({
      where: whereClause,
      include: {
        category: { select: { name: true, slug: true } },
        variants: {
          where: { active: true },
          orderBy: { price: 'asc' },
          select: {
            id: true,
            productId: true,
            name: true,
            sku: true,
            price: true,
            compareAtPrice: true,
            unitLabel: true,
            quotaRemaining: true,
            active: true,
            deliveryType: true,
            deliveryModel: true,
            subscriptionDays: true,
            sharedSafetyBufferDays: true,
          },
        },
        reviews: { where: { status: 'APPROVED' }, select: { rating: true } },
      },
      orderBy,
    }),
    db.category.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true, description: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  // Collect all variants across all products for a single batched stock lookup
  const allVariants = rawProducts.flatMap((p) => p.variants);
  const stockMap = await SharedStockService.batchGetAvailableStock(allVariants);

  // Attach stock and compute lowest price for each product
  const products = rawProducts.map((p) => {
    const variantsWithStock = p.variants.map((v) => ({
      ...v,
      availableStock: stockMap.get(v.id) || 0,
    }));
    const lowestPrice = variantsWithStock[0]?.price || 0;
    return { ...p, variants: variantsWithStock, lowestPrice };
  });

  // In-memory sorting for price options
  if (sort === 'price-low') {
    products.sort((a, b) => a.lowestPrice - b.lowestPrice);
  } else if (sort === 'price-high') {
    products.sort((a, b) => b.lowestPrice - a.lowestPrice);
  }

  const activeCategory = category
    ? categories.find((c) => c.slug === category)
    : null;

  // Filter out temporary test categories with timestamp names for clean storefront UI
  const displayCategories = categories.filter(c => !c.name.startsWith('Test Category') && !c.name.startsWith('Digital Apps 178'));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      
      {/* Header Banner */}
      <div className="space-y-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-cyan-400 shrink-0" />
            <span>{activeCategory ? activeCategory.name : 'Katalog Produk Digital'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            {activeCategory?.description || 'Jelajahi seluruh lisensi software, akun AI, dan aset produktivitas legal dengan garansi terjamin.'}
          </p>
        </div>

        {/* Categories Fast Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs no-scrollbar w-full">
          <Link
            href="/products"
            className={`px-4 py-2 rounded-xl border transition whitespace-nowrap font-bold shrink-0 ${
              !category
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            Semua Produk
          </Link>

          <Link
            href="/categories"
            className="px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-bold hover:bg-cyan-500/20 transition whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Galeri Kategori &rarr;</span>
          </Link>

          {displayCategories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className={`px-4 py-2 rounded-xl border transition whitespace-nowrap font-bold shrink-0 ${
                category === c.slug
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Interactive Controls Bar (Search Input + Sort & Promo Filter) */}
      <div className="rounded-2xl glass-panel border border-slate-800/80 bg-slate-900/60 p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        
        {/* Search Bar inside Catalog */}
        <form action="/products" method="GET" className="relative flex-1">
          {category && <input type="hidden" name="category" value={category} />}
          {deals && <input type="hidden" name="deals" value={deals} />}
          {sort && <input type="hidden" name="sort" value={sort} />}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Cari produk digital (contoh: ChatGPT, Canva, Netflix...)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition text-xs font-medium"
            />
          </div>
        </form>

        {/* Sort & Quick Options */}
        <div className="flex flex-wrap items-center gap-2 justify-between md:justify-end">
          
          {/* Promo Deals Toggle */}
          <Link
            href={`/products?${new URLSearchParams({
              ...(category && { category }),
              ...(q && { q }),
              ...(sort && { sort }),
              ...(deals !== 'true' && { deals: 'true' }),
            }).toString()}`}
            className={`px-3.5 py-2.5 rounded-xl border font-bold transition flex items-center gap-1.5 shrink-0 ${
              deals === 'true'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-950/80 border-slate-800 text-amber-400 hover:border-amber-500/30'
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Promo Special</span>
          </Link>

          {/* Sort Dropdown Link Select */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400 shrink-0 font-medium">Urutkan:</span>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/products?${new URLSearchParams({
                  ...(category && { category }),
                  ...(q && { q }),
                  ...(deals && { deals }),
                  sort: 'latest',
                }).toString()}`}
                className={`px-2 py-1 rounded-lg font-bold transition ${
                  !sort || sort === 'latest' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                Terbaru
              </Link>

              <Link
                href={`/products?${new URLSearchParams({
                  ...(category && { category }),
                  ...(q && { q }),
                  ...(deals && { deals }),
                  sort: 'popular',
                }).toString()}`}
                className={`px-2 py-1 rounded-lg font-bold transition ${
                  sort === 'popular' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                Popular
              </Link>

              <Link
                href={`/products?${new URLSearchParams({
                  ...(category && { category }),
                  ...(q && { q }),
                  ...(deals && { deals }),
                  sort: 'price-low',
                }).toString()}`}
                className={`px-2 py-1 rounded-lg font-bold transition ${
                  sort === 'price-low' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                Termurah
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* Active Filter Badges Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1">
        <div>
          Menampilkan <strong className="text-white font-bold">{products.length}</strong> produk digital
          {activeCategory && (
            <span> dalam kategori <strong className="text-cyan-400 font-bold">{activeCategory.name}</strong></span>
          )}
          {q && (
            <span> dengan kata kunci &quot;<strong className="text-amber-400 font-bold">{q}</strong>&quot;</span>
          )}
        </div>

        {(category || q || sort || deals) && (
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-300 transition"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset Semua Filter</span>
          </Link>
        )}
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-3xl border border-slate-800 space-y-4 p-8">
          <Search className="h-12 w-12 text-slate-600" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-white">Tidak ada produk ditemukan</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Maaf, tidak ada produk digital yang sesuai dengan pencarian atau filter yang Anda pilih.
            </p>
          </div>
          <Link
            href="/products"
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
          >
            Lihat Semua Produk
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {category === 'jasa-digital' && <ServiceChatCard />}
        </div>
      )}

    </div>
  );
}
