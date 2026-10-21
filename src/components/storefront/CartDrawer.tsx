'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { X, Trash2, ShoppingBag, ArrowRight, Tag, Zap } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatIDR } from '@/lib/utils/formatters';

export function CartDrawer() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, isOpen, setIsOpen, subtotal, couponCode, setCouponCode } = useCart();

  if (!isOpen) return null;

  const handleCheckoutClick = () => {
    setIsOpen(false);
    router.push('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col shadow-2xl">
          
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2 font-bold text-lg text-white">
              <ShoppingBag className="h-5 w-5 text-emerald-400" />
              <span>Keranjang Belanja</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400">
                <ShoppingBag className="h-12 w-12 text-slate-600 mb-3" />
                <p className="font-semibold text-slate-300">Keranjang Anda Kosong</p>
                <p className="text-xs text-slate-500 mt-1">Jelajahi katalog produk digital kami yang luar biasa!</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.variantId}
                  className="flex gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80"
                >
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt={item.productName}
                      className="h-16 w-16 rounded-lg object-cover border border-slate-800 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{item.productName}</h4>
                    <p className="text-[11px] text-emerald-400 font-medium">{item.variantName}</p>
                    <p className="text-xs font-bold text-white mt-1">{formatIDR(item.price)}</p>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-slate-800 rounded-lg bg-slate-900">
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className="px-2 py-0.5 text-xs text-slate-400 hover:text-white"
                        >
                          -
                        </button>
                        <span className="px-2 py-0.5 text-xs font-bold text-white">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          className="px-2 py-0.5 text-xs text-slate-400 hover:text-white"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer / Summary */}
          {items.length > 0 && (
            <div className="p-6 border-t border-slate-800 bg-slate-950/80 space-y-4">
              
              {/* Coupon Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Kode Kupon (cth: DISKON10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 py-1.5 pl-8 pr-3 text-xs text-white uppercase placeholder:normal-case placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <Tag className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-white font-bold">{formatIDR(subtotal)}</span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Pengiriman Instan & Pembayaran QRIS Otomatis</span>
              </div>

              <button
                onClick={handleCheckoutClick}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:opacity-95 transition"
              >
                <span>Lanjut ke Pembayaran</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
