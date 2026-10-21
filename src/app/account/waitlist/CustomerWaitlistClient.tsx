'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Bell, CheckCircle2, Clock, XCircle, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerWaitlistClientProps {
  initialWaitlists: any[];
}

export function CustomerWaitlistClient({ initialWaitlists }: CustomerWaitlistClientProps) {
  const { t } = useLanguage();
  const [waitlists, setWaitlists] = useState<any[]>(initialWaitlists);

  const handleCancel = async (variantId: string) => {
    try {
      const res = await fetch('/api/account/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productVariantId: variantId, action: 'CANCEL' }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Notifikasi restock dibatalkan');
        setWaitlists((prev) =>
          prev.map((w) => (w.productVariantId === variantId ? { ...w, status: 'CANCELLED' } : w))
        );
      } else {
        toast.error(json.error || 'Gagal membatalkan waitlist');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi jaringan');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-3">
            <Bell className="h-3.5 w-3.5" /> {t('acc_waitlist_title')}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">{t('acc_waitlist_title')}</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            {t('acc_waitlist_subtitle')}
          </p>
        </div>

        <div className="px-5 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
          <div className="text-xs text-slate-400">Total Menunggu</div>
          <div className="text-2xl font-black text-cyan-400">
            {waitlists.filter((w) => w.status === 'ACTIVE' || w.status === 'NOTIFIED').length}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {waitlists.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-slate-800 text-slate-400">
            <Bell className="h-10 w-10 mx-auto text-slate-600 mb-3" />
            <p className="font-bold text-slate-300">Belum ada produk dalam daftar waitlist Anda.</p>
            <p className="text-xs text-slate-500 mt-1">
              Saat melihat produk yang habis stok, klik button &quot;NOTIFY ME&quot; untuk mendaftar notifikasi restock.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {waitlists.map((w) => {
              const isNotified = w.status === 'NOTIFIED';
              const isConverted = w.status === 'CONVERTED';
              const isCancelled = w.status === 'CANCELLED';

              return (
                <div
                  key={w.id}
                  className={`p-5 rounded-2xl border transition ${
                    isNotified
                      ? 'bg-cyan-950/20 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : isConverted
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          isNotified
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                            : isConverted
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isCancelled
                            ? 'bg-slate-800 text-slate-500 border-slate-700'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isNotified ? 'STOK TERSEDIA KEMBALI!' : isConverted ? 'DIBELI (CONVERTED)' : isCancelled ? 'DIBATALKAN' : 'MENUNGGU RESTOCK'}
                      </span>
                      <h3 className="text-base font-bold text-white mt-2">{w.variant?.product?.name}</h3>
                      <p className="text-xs text-slate-400">{w.variant?.name}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <span>Mendaftar: {new Date(w.createdAt).toLocaleDateString('id-ID')}</span>
                    {w.notifiedAt && (
                      <span className="text-cyan-400">Notified: {new Date(w.notifiedAt).toLocaleDateString('id-ID')}</span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {isNotified && w.variant?.product?.slug ? (
                      <Link
                        href={`/products/${w.variant.product.slug}`}
                        className="flex-1 py-2 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                      >
                        <ShoppingBag className="h-4 w-4" /> BELI SEKARANG
                      </Link>
                    ) : w.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleCancel(w.productVariantId)}
                        className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition flex items-center justify-center gap-2"
                      >
                        <XCircle className="h-4 w-4 text-rose-400" /> Batal Notifikasi
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
