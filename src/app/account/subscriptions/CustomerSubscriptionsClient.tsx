'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { formatDateJakarta } from '@/lib/utils/formatters';
import { RefreshCw, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/Pagination';

export function CustomerSubscriptionsClient({ subscriptions }: { subscriptions: any[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loadingSubId, setLoadingSubId] = useState<string | null>(null);

  const totalPages = Math.ceil(subscriptions.length / itemsPerPage);
  const paginatedSubs = subscriptions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleRenew = async (subId: string) => {
    setLoadingSubId(subId);
    try {
      const res = await fetch('/api/account/renewals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subId }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data?.orderNumber) {
        toast.success('Order Renewal berhasil dibuat! Mengalihkan ke pembayaran...');
        router.push(`/payment/${json.data.orderNumber}`);
      } else {
        toast.error(json.error || 'Gagal memproses perpanjangan');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi jaringan');
    } finally {
      setLoadingSubId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
            <span>{t('acc_subs_title')}</span>
          </h1>
          <p className="text-xs text-slate-400">{t('acc_subs_subtitle')}</p>
        </div>

        <Link
          href="/account/renewals"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-cyan-400 hover:bg-blue-500/20 text-xs font-semibold transition"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pusat Renewal &amp; Perpanjangan</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {subscriptions.length === 0 ? (
        <div className="rounded-3xl glass-panel border border-slate-800 p-12 text-center text-slate-400 text-xs">
          {t('acc_subs_empty')}
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedSubs.map((sub) => {
            const expiresAt = new Date(sub.expiresAt);
            const isExpired = expiresAt < new Date();
            const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            const isRenewing = loadingSubId === sub.id;

            return (
              <div key={sub.id} className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-white">{sub.variant?.product?.name}</h3>
                    <p className="text-xs text-blue-600 dark:text-cyan-400 font-semibold">{sub.variant?.name}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{t('acc_subs_expires_at')}: {formatDateJakarta(expiresAt)}</p>
                  </div>

                  <span className={`rounded-full border text-[10px] font-bold px-2.5 py-0.5 ${
                    isExpired ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-cyan-400'
                  }`}>
                    {isExpired ? t('acc_orders_status_expired') : `${daysLeft} ${t('acc_subs_days_left')}`}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <Link
                    href={`/products/${sub.variant?.product?.slug}`}
                    className="text-xs text-slate-400 hover:text-slate-200 transition"
                  >
                    Detail Produk
                  </Link>

                  <button
                    onClick={() => handleRenew(sub.id)}
                    disabled={isRenewing}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white transition shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isRenewing ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    <span>{isRenewing ? 'Memproses...' : t('acc_subs_renew_now')}</span>
                  </button>
                </div>
              </div>
            );
          })}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={subscriptions.length}
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

