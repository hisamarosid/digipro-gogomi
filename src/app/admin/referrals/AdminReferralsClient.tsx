'use client';

import React, { useState } from 'react';
import { Gift, Users, Coins, TrendingUp, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/Pagination';

interface AdminReferralsClientProps {
  totalRegistrations: number;
  qualifiedCount: number;
  pendingCount: number;
  totalCoinsIssued: number;
  conversionRatePct: string;
  rewards: any[];
}

export function AdminReferralsClient({
  totalRegistrations,
  qualifiedCount,
  pendingCount,
  totalCoinsIssued,
  conversionRatePct,
  rewards: initialRewards,
}: AdminReferralsClientProps) {
  const [rewards, setRewards] = useState<any[]>(initialRewards);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const paginatedRewards = rewards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAction = async (rewardId: string, action: 'APPROVE' | 'REJECT') => {
    setIsProcessingId(rewardId);
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId, action }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message);
        setRewards((prev) =>
          prev.map((r) => (r.id === rewardId ? { ...r, status: action === 'APPROVE' ? 'REWARDED' : 'REJECTED' } : r))
        );
      } else {
        toast.error(json.error || 'Gagal memproses referral');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi jaringan');
    } finally {
      setIsProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Gift className="h-3.5 w-3.5" />
              <span>Viral Growth &amp; Affiliate Rewards</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Program Referral
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Pantau performa referral reward, konversi pendaftaran pelanggan baru, dan peninjauan anti-abuse risk flags.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Registrasi via Referral</p>
          <p className="text-2xl font-black text-white">{totalRegistrations} <span className="text-xs text-slate-500 font-normal">User</span></p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Referral Qualified</p>
          <p className="text-2xl font-black text-emerald-300">{qualifiedCount}</p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Conversion Rate</p>
          <p className="text-2xl font-black text-cyan-300">{conversionRatePct}%</p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Coin Reward Dikeluarkan</p>
          <p className="text-2xl font-black text-amber-300 font-mono">+{totalCoinsIssued}</p>
        </div>
      </div>

      {/* Referral Rewards Table */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Gift className="h-5 w-5 text-blue-400" /> Daftar Referral Reward & Risk Flag Review
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-4">Referrer (Pengajak)</th>
                <th className="p-4">Referred (Teman Baru)</th>
                <th className="p-4">Referrer Coin</th>
                <th className="p-4">Hold Expiry</th>
                <th className="p-4">Status</th>
                <th className="p-4">Aksi / Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {rewards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                    Belum ada riwayat transaksi referral.
                  </td>
                </tr>
              ) : (
                paginatedRewards.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="p-4 font-sans">
                      <div className="font-bold text-white">{r.referrer?.name}</div>
                      <div className="text-[10px] text-blue-400 font-mono">Kode: {r.referrer?.referralCode}</div>
                    </td>
                    <td className="p-4 font-sans text-slate-300">
                      <div>{r.referred?.name}</div>
                      <div className="text-[10px] text-slate-500">{r.referred?.email}</div>
                    </td>
                    <td className="p-4 font-bold text-amber-400">+{r.referrerCoins} Coins</td>
                    <td className="p-4 text-slate-400 font-sans">{new Date(r.holdExpiresAt).toLocaleDateString('id-ID')}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          r.status === 'REWARDED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : r.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {r.status === 'PENDING' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAction(r.id, 'APPROVE')}
                            disabled={isProcessingId === r.id}
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 transition"
                            title="Setujui Cairkan Koin"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleAction(r.id, 'REJECT')}
                            disabled={isProcessingId === r.id}
                            className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 transition"
                            title="Tolak Reward"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[10px] font-sans">Selesai</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
    </div>
  );
}
