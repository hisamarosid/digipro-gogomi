'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import { Coins, Clock, AlertTriangle, ArrowUpRight, ArrowDownLeft, ShieldCheck, RefreshCw, ShoppingBag } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

interface AccountCoinsClientProps {
  balance: {
    availableCoins: number;
    pendingCoins: number;
    reservedCoins: number;
    expiringSoonCoins: number;
    totalEarnedCoins: number;
    totalRedeemedCoins: number;
    currencyEquivalent: number;
    coinName: string;
    currencyValuePerCoin: number;
  };
  initialHistory: any[];
}

export function AccountCoinsClient({ balance, initialHistory }: AccountCoinsClientProps) {
  const { t } = useLanguage();
  const [history] = useState<any[]>(initialHistory);
  const [filterType, setFilterType] = useState('ALL');

  const filteredHistory = history.filter((item) => {
    if (filterType === 'EARN') return item.type === 'EARN' || item.type === 'BONUS' || item.type === 'REFUND_RETURN' || item.type === 'ADJUSTMENT_ADD';
    if (filterType === 'REDEEM') return item.type === 'REDEEM' || item.type === 'RESERVE' || item.type === 'ADJUSTMENT_DEDUCT';
    if (filterType === 'EXPIRED') return item.type === 'EXPIRE' || item.type === 'REVERSAL';
    return true;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-400" />
          <span>{t('acc_coins_title')}</span>
        </h1>
        <p className="text-xs text-slate-400">
          {t('acc_coins_subtitle')}
        </p>
      </div>

      {/* BALANCE METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Available Balance */}
        <div className="p-5 rounded-3xl glass-panel border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-slate-900 space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold uppercase tracking-wider">
            <span>{t('acc_coins_available')}</span>
            <Coins className="h-4 w-4" />
          </div>
          <div>
            <span className="text-3xl font-black text-white font-mono">
              {balance.availableCoins.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-amber-400 ml-1">Coins</span>
          </div>
          <div className="pt-1 border-t border-amber-500/20 flex items-center justify-between text-xs">
            <span className="text-slate-400">Setara Rupiah:</span>
            <span className="font-extrabold text-emerald-400 font-mono">
              {formatIDR(balance.currencyEquivalent)}
            </span>
          </div>
        </div>

        {/* Pending Balance */}
        <div className="p-5 rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Coin Tertunda (Pending 7 Hari)</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <span className="text-3xl font-black text-white font-mono">
              {balance.pendingCoins.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-cyan-400 ml-1">Coins</span>
          </div>
          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
            Akan aktif otomatis 7 hari setelah pesanan COMPLETED.
          </p>
        </div>

        {/* Expiring Soon / Reserved */}
        <div className="p-5 rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Kadaluarsa & Reserved</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Expiring (&lt; 7h):</span>
              <span className="font-bold text-rose-400 font-mono">{balance.expiringSoonCoins.toLocaleString()} Coins</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Ter-reserve Checkout:</span>
              <span className="font-bold text-amber-400 font-mono">{balance.reservedCoins.toLocaleString()} Coins</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
            Coin berlaku selama 365 hari dari tanggal ketersediaan.
          </p>
        </div>

      </div>

      {/* EXPIRING SOON WARNING BANNER */}
      {balance.expiringSoonCoins > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-white">
                {balance.expiringSoonCoins.toLocaleString()} Store Coin Anda akan kedaluwarsa dalam 7 hari!
              </p>
              <p className="text-[11px] text-amber-200/80">Gunakan coin Anda sebelum masa berlakunya habis saat checkout.</p>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION HISTORY SECTION */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-white">Riwayat Transaksi Coin (Ledger History)</h3>
            <p className="text-[11px] text-slate-400">Catatan transparan perolehan, penukaran, dan pengembalian coin.</p>
          </div>

          <div className="flex gap-1.5 text-xs">
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'EARN', label: 'Perolehan (+)' },
              { id: 'REDEEM', label: 'Penukaran (-)' },
              { id: 'EXPIRED', label: 'Kedaluwarsa' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition text-[11px] ${
                  filterType === tab.id
                    ? 'bg-blue-600 text-white shadow font-extrabold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">Belum ada riwayat transaksi coin.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2.5">
              {paginatedHistory.map((entry) => {
                const isPositive = entry.amountCoins > 0;
                const isEarn = entry.type === 'EARN' || entry.type === 'BONUS' || entry.type === 'REFUND_RETURN' || entry.type === 'ADJUSTMENT_ADD';

                return (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isEarn
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : entry.type === 'EXPIRE' || entry.type === 'REVERSAL'
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        }`}
                      >
                        {isEarn ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>

                      <div>
                        <p className="font-bold text-white line-clamp-1">{entry.description}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                          <span>{formatDateJakarta(entry.createdAt)}</span>
                          {entry.expiresAt && (
                            <span>| Exp: {formatDateJakarta(entry.expiresAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono font-black text-sm block ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? `+${entry.amountCoins.toLocaleString()}` : `${entry.amountCoins.toLocaleString()}`}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Saldo: {entry.balanceAfter.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredHistory.length / itemsPerPage)}
              totalItems={filteredHistory.length}
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

    </div>
  );
}
