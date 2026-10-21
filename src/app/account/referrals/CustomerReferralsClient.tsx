'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Copy, Share2, Users, Coins, Gift, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/Pagination';

interface CustomerReferralsClientProps {
  referralCode: string;
  referralLink: string;
  successfulReferrals: number;
  pendingReferrals: number;
  coinsEarned: number;
  rewards: any[];
}

export function CustomerReferralsClient({
  referralCode,
  referralLink,
  successfulReferrals,
  pendingReferrals,
  coinsEarned,
  rewards,
}: CustomerReferralsClientProps) {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const paginatedRewards = rewards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} berhasil disalin!`);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Dapatkan produk digital legal & terpercaya di Gogomi Store! Gunakan kode referral saya ${referralCode} atau daftar lewat link: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl glass-panel border border-slate-800/80 bg-slate-900/60 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10" />
        
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Gift className="h-3.5 w-3.5" />
            <span>{t('acc_ref_title')}</span>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              {t('acc_ref_title')}
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              {t('acc_ref_subtitle')}
            </p>
          </div>

          {/* Referral Link & Code Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            
            {/* Kode Referral */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-400">Kode Referral Anda</label>
              <div className="flex items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 font-mono text-lg font-black text-blue-600 dark:text-cyan-400">
                <span>{referralCode}</span>
                <button
                  onClick={() => copyToClipboard(referralCode, 'Kode Referral')}
                  className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-cyan-400 border border-blue-500/20 transition"
                  title="Salin Kode"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Link Referral */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-400">Link Referral Cepat</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={referralLink}
                  className="flex-1 rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-xs text-slate-300 font-mono focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(referralLink, 'Link Referral')}
                  className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center gap-1.5 text-xs shadow-md shadow-blue-500/20 shrink-0"
                >
                  <Copy className="h-4 w-4" /> Salin
                </button>
                <button
                  onClick={shareWhatsApp}
                  className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shrink-0"
                  title="Bagikan ke WhatsApp"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Referral Sukses</div>
            <div className="text-2xl font-black text-white mt-1">{successfulReferrals} Teman</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-cyan-400 border border-blue-500/20">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Menunggu Hold (7 Hari)</div>
            <div className="text-2xl font-black text-amber-500 mt-1">{pendingReferrals} Pending</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Coin Didapat</div>
            <div className="text-2xl font-black text-amber-500 mt-1">+{coinsEarned} Coin</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Coins className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* Referral History Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
          <span>Riwayat Referral Teman</span>
        </h2>

        {rewards.length === 0 ? (
          <div className="p-6 text-center rounded-2xl glass-panel border border-slate-800 text-slate-400 text-xs sm:text-sm">
            Belum ada teman yang bergabung menggunakan kode referal Anda.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="divide-y divide-slate-800/80">
                {paginatedRewards.map((r) => (
                  <div key={r.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-800/50 transition">
                    <div>
                      <div className="font-mono font-bold text-white">{r.referredEmail}</div>
                      <div className="text-slate-400 mt-0.5">
                        Bergabung: {new Date(r.createdAt).toLocaleDateString('id-ID')}
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          r.status === 'REWARDED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : r.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {r.status === 'REWARDED' ? '+500 COIN CAIR' : r.status === 'PENDING' ? 'PENDING HOLD' : r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(rewards.length / itemsPerPage)}
              totalItems={rewards.length}
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
