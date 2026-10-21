'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Award, Sparkles, CheckCircle2, ShieldCheck, Gift, History } from 'lucide-react';

interface CustomerLoyaltyClientProps {
  loyaltyData: any;
  milestones: any[];
}

export function CustomerLoyaltyClient({ loyaltyData, milestones }: CustomerLoyaltyClientProps) {
  const { t } = useLanguage();

  const currentTier = loyaltyData?.currentTier;
  const nextTier = loyaltyData?.nextTier;
  const progress = loyaltyData?.progressPercentage || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
          <Award className="h-7 w-7 text-cyan-400" />
          <span>{t('acc_loyalty_title')}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {t('acc_loyalty_subtitle')}
        </p>
      </div>

      {/* Main Tier Progress Card */}
      <div className="rounded-3xl glass-panel border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 p-6 md:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs text-cyan-400 uppercase font-bold tracking-wider">Level Keanggotaan Anda</span>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-white">{currentTier?.name || 'Bronze Member'}</h2>
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{currentTier?.badgeLabel || 'Bronze'}</span>
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400">Total Transaksi Selesai</span>
            <p className="text-2xl font-bold text-white">
              Rp{(loyaltyData?.qualifiedSpend || 0).toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Progress Bar to Next Tier */}
        {nextTier ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Kemajuan Menuju Tier <strong>{nextTier.name}</strong></span>
              <span className="text-cyan-400 font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Belanja <strong>Rp{(loyaltyData?.spendToNextTier || 0).toLocaleString('id-ID')}</strong> lagi untuk naik ke level <strong>{nextTier.name}</strong>!
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>Selamat! Anda telah mencapai level keanggotaan tertinggi <strong>(Platinum Sultan)</strong>!</span>
          </div>
        )}

        {/* Benefits Grid */}
        <div className="pt-4 border-t border-slate-800/80">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Keuntungan Tier {currentTier?.name}:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px]">Multiplier Koin</span>
              <p className="font-bold text-cyan-400 text-sm">{currentTier?.coinRewardMultiplier || 1.0}x Koin</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px]">Batas Tukar Koin Max</span>
              <p className="font-bold text-emerald-400 text-sm">{currentTier?.maxCoinRedemptionPercentageOverride || 30}% Order</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px]">Diskon Perpanjangan</span>
              <p className="font-bold text-purple-400 text-sm">{currentTier?.renewalDiscountPercentage || 0}% Off</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px]">Layanan Pelanggan CS</span>
              <p className="font-bold text-amber-400 text-sm">
                {currentTier?.prioritySupportEnabled ? 'Prioritas VIP' : 'Standar'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Milestones Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Gift className="h-5 w-5 text-purple-400" />
          <span>Milestone Pembelian & Hadiah Koin</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {milestones.map((m) => (
            <div
              key={m.id}
              className={`p-4 rounded-2xl border transition ${
                m.isEarned
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <div>
                  <h4 className="font-bold text-sm text-white">{m.name}</h4>
                  <p className="text-[11px] text-slate-400">
                    Syarat: {m.triggerType === 'COMPLETED_ORDER_COUNT' ? `${m.triggerValue} Pesanan Selesai` : `Rp${m.triggerValue.toLocaleString('id-ID')} Spend`}
                  </p>
                </div>
                {m.isEarned ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Telah Diterima (+{m.rewardValue} Koin)</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-bold text-[10px]">
                    +{m.rewardValue} Koin
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tier History Section */}
      {loyaltyData?.history && loyaltyData.history.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-blue-400" />
            <span>Riwayat Perubahan Tier</span>
          </h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800 text-xs">
            {loyaltyData.history.map((h: any) => (
              <div key={h.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-white">{h.reason}</p>
                  <p className="text-[10px] text-slate-400">Spend saat itu: Rp{(h.qualifiedSpendSnapshot || 0).toLocaleString('id-ID')}</p>
                </div>
                <span className="text-[10px] text-slate-400">{new Date(h.changedAt).toLocaleDateString('id-ID')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
