'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/Pagination';

interface CustomerWishlistClientProps {
  initialItems: any[];
}

export function CustomerWishlistClient({ initialItems }: CustomerWishlistClientProps) {
  const { t } = useLanguage();
  const [wishlistItems, setWishlistItems] = useState<any[]>(initialItems || []);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const paginatedWishlist = wishlistItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleRemove = async (wishlistItemId: string) => {
    try {
      const res = await fetch('/api/account/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishlistItemId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Item dihapus dari wishlist');
        setWishlistItems((prev) => prev.filter((i) => i.id !== wishlistItemId));
      } else {
        toast.error(json.error || 'Gagal menghapus');
      }
    } catch {
      toast.error('Gagal menghapus item wishlist');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
          <Heart className="h-7 w-7 text-rose-500 fill-rose-500" />
          <span>{t('acc_wishlist_title')}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {t('acc_wishlist_subtitle')}
        </p>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-12 text-center space-y-4">
          <Heart className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">Wishlist Anda Masih Kosong</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Jelajahi katalog lisensi & akun digital legal Gogomi Store lalu tekan ikon hati pada produk favorit Anda!
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 font-bold text-xs text-slate-950 transition"
          >
            <span>Jelajahi Produk Sekarang</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedWishlist.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between space-y-4 shadow-lg hover:border-slate-700 transition"
              >
                <div className="flex gap-4">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.productName}
                      className="h-20 w-20 rounded-xl object-cover shrink-0 border border-slate-800"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                      <ShoppingBag className="h-8 w-8 text-slate-600" />
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <h3 className="font-bold text-sm text-white line-clamp-2">{item.productName}</h3>
                    {item.variantName && (
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {item.variantName}
                      </span>
                    )}
                    <div className="pt-1 flex items-center gap-2">
                      <span className="font-bold text-cyan-400 text-sm">
                        Rp{item.currentPrice.toLocaleString('id-ID')}
                      </span>
                      {item.hasPriceDrop && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                          <span>Turun Rp{item.priceDropDelta.toLocaleString('id-ID')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-xs">
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="text-slate-400 hover:text-rose-400 flex items-center gap-1 text-[11px] transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus</span>
                  </button>

                  <Link
                    href={`/products/${item.productSlug}`}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 font-bold text-slate-950 transition flex items-center gap-1 text-[11px]"
                  >
                    <span>Beli Sekarang</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(wishlistItems.length / itemsPerPage)}
            totalItems={wishlistItems.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
