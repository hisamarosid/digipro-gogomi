'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Bell, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/Pagination';

interface CustomerPriceAlertsClientProps {
  initialAlerts: any[];
}

export function CustomerPriceAlertsClient({ initialAlerts }: CustomerPriceAlertsClientProps) {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<any[]>(initialAlerts || []);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const paginatedAlerts = alerts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCancel = async (priceWatchId: string) => {
    try {
      const res = await fetch('/api/account/price-alerts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceWatchId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Price alert dibatalkan');
        setAlerts((prev) => prev.filter((a) => a.id !== priceWatchId));
      } else {
        toast.error(json.error || 'Gagal membatalkan alert');
      }
    } catch {
      toast.error('Gagal membatalkan alert');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
          <Bell className="h-7 w-7 text-amber-400" />
          <span>{t('acc_alerts_title')}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {t('acc_alerts_subtitle')}
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-12 text-center space-y-4">
          <Bell className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">Tidak Ada Price Alert Aktif</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Aktifkan notifikasi harga di halaman produk digital untuk mendapatkan pesan instan saat harga turun!
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 font-bold text-xs text-slate-950 transition"
          >
            <span>Jelajahi Produk</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {paginatedAlerts.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/80 p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg text-xs"
              >
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-white">{item.productName}</h3>
                  <p className="text-slate-400">{item.variantName}</p>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-slate-400">Harga Awal Watch: Rp{item.referencePrice.toLocaleString('id-ID')}</span>
                    <span className="font-bold text-cyan-400">Harga Sekarang: Rp{item.currentPrice.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleCancel(item.id)}
                    className="px-3 py-1.5 rounded-xl border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition flex items-center gap-1 text-[11px]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Batalkan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(alerts.length / itemsPerPage)}
            totalItems={alerts.length}
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
