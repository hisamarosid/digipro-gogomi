'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { RefreshCw, Clock, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/Pagination';

interface CustomerRenewalsClientProps {
  expiringSoon: any[];
  activeProducts: any[];
  expiredProducts: any[];
  renewalHistory: any[];
}

export function CustomerRenewalsClient({
  expiringSoon: initialExpiring,
  activeProducts,
  expiredProducts,
  renewalHistory,
}: CustomerRenewalsClientProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [expiringSoon] = useState<any[]>(initialExpiring);
  const [loadingSubId, setLoadingSubId] = useState<string | null>(null);

  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(10);
  const paginatedHistory = renewalHistory.slice(
    (historyPage - 1) * historyPerPage,
    historyPage * historyPerPage
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
        toast.error(json.error || 'Gagal memproses renewal');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi jaringan');
    } finally {
      setLoadingSubId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/60 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{t('acc_renewals_title')}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">{t('acc_renewals_title')}</h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-xl leading-relaxed">
              {t('acc_renewals_subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 shrink-0">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">Akan Expired (7 Hari)</div>
              <div className="text-2xl font-black text-amber-500">{expiringSoon.length} Produk</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Expiring Soon */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <span>Segera Expired (Perlu Perpanjangan)</span>
          </h2>
          <span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            {expiringSoon.length} Produk
          </span>
        </div>

        {expiringSoon.length === 0 ? (
          <div className="p-8 text-center rounded-2xl glass-panel border border-slate-800 text-slate-400 text-xs sm:text-sm">
            Tidak ada produk yang mendekati masa expired dalam 7 hari ke depan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expiringSoon.map((sub) => (
              <div
                key={sub.id}
                className="p-5 rounded-2xl glass-panel border border-amber-500/30 bg-slate-900/60 hover:border-amber-500/60 transition shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Sisa {sub.remainingDays} Hari
                      </span>
                      <h3 className="text-base font-bold text-white mt-2">{sub.variant?.product?.name}</h3>
                      <p className="text-xs text-slate-400">{sub.variant?.name}</p>
                    </div>

                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-cyan-400 border border-blue-500/20">
                      {sub.status}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Expired Pada:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {new Date(sub.expiresAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    onClick={() => handleRenew(sub.id)}
                    disabled={loadingSubId === sub.id}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {loadingSubId === sub.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" /> PERPANJANG SEKARANG
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Active Products */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <span>Produk Aktif Lainnya</span>
        </h2>

        {activeProducts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl glass-panel border border-slate-800 text-slate-400 text-xs sm:text-sm">
            Belum ada langganan produk aktif lainnya.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeProducts.map((sub) => (
              <div key={sub.id} className="p-4 rounded-2xl glass-panel border border-slate-800 bg-slate-900/60">
                <h3 className="text-sm font-bold text-white">{sub.variant?.product?.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{sub.variant?.name}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Exp: {new Date(sub.expiresAt).toLocaleDateString('id-ID')}</span>
                  <button
                    onClick={() => handleRenew(sub.id)}
                    className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    Renew <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: Renewal History */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
          <span>Riwayat Transaksi Perpanjangan</span>
        </h2>

        {renewalHistory.length === 0 ? (
          <div className="p-6 text-center rounded-2xl glass-panel border border-slate-800 text-slate-400 text-xs sm:text-sm">
            Belum ada riwayat perpanjangan.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="divide-y divide-slate-800/80">
                {paginatedHistory.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-800/50 transition">
                    <div>
                      <div className="font-mono font-bold text-white">{item.orderNumber}</div>
                      <div className="text-slate-400 mt-0.5">{item.items[0]?.productName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-500">Rp{item.grandTotal.toLocaleString('id-ID')}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(item.createdAt).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Pagination
              currentPage={historyPage}
              totalPages={Math.ceil(renewalHistory.length / historyPerPage)}
              totalItems={renewalHistory.length}
              itemsPerPage={historyPerPage}
              onPageChange={setHistoryPage}
              onItemsPerPageChange={(val) => {
                setHistoryPerPage(val);
                setHistoryPage(1);
              }}
            />
          </div>
        )}
      </div>

    </div>
  );
}
