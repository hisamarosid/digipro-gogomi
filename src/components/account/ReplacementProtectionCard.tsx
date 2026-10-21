'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, ShieldCheck, Clock, AlertTriangle, CheckCircle2, History, ChevronDown, ChevronUp, Calendar, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateJakarta } from '@/lib/utils/formatters';

interface ReplacementProtectionCardProps {
  orderItemId: string;
}

export function ReplacementProtectionCard({ orderItemId }: ReplacementProtectionCardProps) {
  const [loading, setLoading] = useState(true);
  const [eligibilityData, setEligibilityData] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedReason, setSelectedReason] = useState('CANNOT_LOGIN');
  const [customerNote, setCustomerNote] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const fetchEligibility = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/account/products/${orderItemId}/replacement`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      const json = await res.json();

      if (json.success) {
        setEligibilityData(json.data);

        if (json.data.nextEligibleAt) {
          const nextTime = new Date(json.data.nextEligibleAt).getTime();
          const diff = Math.max(0, Math.floor((nextTime - Date.now()) / 1000));
          setRemainingSeconds(diff);
        } else {
          setRemainingSeconds(0);
        }
      } else {
        setEligibilityData({
          eligible: false,
          reason: json.error || 'UNAVAILABLE',
          mode: 'DISABLED',
        });
      }
    } catch (err) {
      console.error('Failed to fetch replacement eligibility:', err);
      setEligibilityData({
        eligible: false,
        reason: 'FETCH_ERROR',
        mode: 'DISABLED',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEligibility();
  }, [orderItemId]);

  // Live countdown timer effect (ticks every 1 second)
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          fetchEligibility(); // Refresh when countdown reaches zero
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds]);

  const handleRequestReplacement = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/account/products/${orderItemId}/replacement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `rep-${orderItemId}-${Date.now()}`,
        },
        body: JSON.stringify({
          reason: selectedReason,
          customerNote,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || json.message || 'Gagal memproses replacement');
        return;
      }

      toast.success(json.message || 'Replacement berhasil!');
      setShowModal(false);
      fetchEligibility();
      window.location.reload(); // Refresh page to display new active credential
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCountdown = (totalSec: number) => {
    const days = Math.floor(totalSec / (3600 * 24));
    const hours = Math.floor((totalSec % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    if (days > 0) {
      return `${days} Hari ${hours} Jam ${minutes} Mnt ${seconds} Dtk`;
    }
    return `${hours} Jam ${minutes} Mnt ${seconds} Dtk`;
  };

  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2 animate-pulse">
        <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
        <span>Memuat status Replacement Protection...</span>
      </div>
    );
  }

  if (!eligibilityData) {
    return null;
  }

  if (eligibilityData.mode === 'DISABLED' || eligibilityData.reason === 'REPLACEMENT_DISABLED') {
    return (
      <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <div>
              <span className="font-bold text-white block">Garansi Produk Standar</span>
              <span className="text-[10px] text-slate-400">Garansi penuh sesuai syarat & ketentuan produk.</span>
            </div>
          </div>
          <span className="font-mono text-cyan-400 font-bold text-[11px]">
            {eligibilityData.validUntil ? formatDateJakarta(eligibilityData.validUntil) : 'Garansi Aktif'}
          </span>
        </div>
      </div>
    );
  }

  const {
    eligible,
    reason,
    nextEligibleAt,
    lastReplacementAt,
    completedCount,
    maxReplacement,
    validUntil,
    history = [],
    requiresReason,
  } = eligibilityData;

  const isCooldown = reason === 'COOLDOWN_ACTIVE' || (remainingSeconds !== null && remainingSeconds > 0);

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-cyan-500/10 text-blue-600 dark:text-cyan-400 border border-blue-200 dark:border-cyan-500/20">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Replacement Protection</span>
              <span className="text-[10px] bg-blue-100 dark:bg-cyan-500/20 text-blue-700 dark:text-cyan-400 border border-blue-200 dark:border-cyan-500/30 px-2 py-0.5 rounded-full font-semibold">
                ACTIVE
              </span>
            </h4>
            <p className="text-[10px] text-slate-600 dark:text-slate-400">Garansi penggantian akun/lisensi otomatis jika terjadi kendala.</p>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="text-right text-[11px]">
          <span className="text-slate-600 dark:text-slate-400">Terpakai: </span>
          <span className="font-bold text-blue-600 dark:text-cyan-400">{completedCount}</span>
          <span className="text-slate-500 dark:text-slate-500"> / {maxReplacement != null ? maxReplacement : '∞'}</span>
        </div>
      </div>

      {/* Prominent Live Countdown & Replacement Schedule Banner */}
      <div className="p-3.5 rounded-2xl bg-blue-50/40 dark:bg-slate-950 border border-blue-100 dark:border-slate-800/90 space-y-3 shadow-sm">
        
        {/* Row 1: Expiry Date */}
        <div className="flex items-center justify-between text-xs border-b border-blue-100 dark:border-slate-800/80 pb-2">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>Masa Kadaluarsa Proteksi (Expiry Date):</span>
          </div>
          <span className="font-bold text-blue-600 dark:text-cyan-400 font-mono">
            {validUntil ? formatDateJakarta(validUntil) : 'Berlaku Selamanya'}
          </span>
        </div>

        {/* Row 2: Prominent Next Replacement Schedule */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" />
              <span>Jadwal Replacement Berikutnya:</span>
            </span>
            <span className="font-extrabold text-blue-600 dark:text-cyan-400 font-mono text-xs">
              {nextEligibleAt ? formatDateJakarta(nextEligibleAt) : 'Tersedia Sekarang'}
            </span>
          </div>

          {/* Live Cooldown Countdown */}
          {isCooldown && remainingSeconds ? (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Sisa Waktu Cooldown:</span>
              <span className="font-mono font-black text-amber-600 dark:text-amber-400 animate-pulse text-xs">
                ⏳ {formatCountdown(remainingSeconds)}
              </span>
            </div>
          ) : eligible ? (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Status Kelayakan:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>SIAP REPLACEMENT SEKARANG</span>
              </span>
            </div>
          ) : null}
        </div>

        {/* Row 3: Last Replacement Info */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
          <span>Terakhir Replacement:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {lastReplacementAt ? formatDateJakarta(lastReplacementAt) : 'Belum Pernah'}
          </span>
        </div>

      </div>

      {/* Action Button & History Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-medium py-1"
          >
            <History className="h-3.5 w-3.5" />
            <span>Riwayat Replacement ({history.length})</span>
            {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}

        <div className="ml-auto w-full sm:w-auto">
          {eligible ? (
            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-5 py-2.5 text-xs font-black shadow-lg shadow-blue-500/20 transition cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>REQUEST REPLACEMENT SEKARANG</span>
            </button>
          ) : isCooldown ? (
            <button
              disabled
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-amber-50/80 dark:bg-slate-900 border border-amber-200 dark:border-slate-800 text-amber-800 dark:text-slate-400 px-5 py-2.5 text-xs font-bold cursor-not-allowed"
              title={`Belum bisa replacement. Jadwal: ${nextEligibleAt ? formatDateJakarta(nextEligibleAt) : 'Cooldown'}`}
            >
              <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500/70" />
              <span>Belum Waktunya ({formatCountdown(remainingSeconds || 0)})</span>
            </button>
          ) : (
            <button
              disabled
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-500 px-5 py-2.5 text-xs font-bold cursor-not-allowed"
            >
              <Lock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
              <span>{reason === 'MAX_REPLACEMENT_REACHED' ? 'Batas Maksimal Tercapai' : 'Replacement Tidak Tersedia'}</span>
            </button>
          )}
        </div>
      </div>

      {/* History Drawer */}
      {showHistory && history.length > 0 && (
        <div className="mt-2 space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs">
          <h5 className="font-bold text-slate-300 text-[11px] uppercase tracking-wider mb-2">Riwayat Penggantian Akun</h5>
          {history.map((h: any, idx: number) => (
            <div key={h.id} className="flex items-center justify-between border-b border-slate-900 pb-2 last:border-0 last:pb-0">
              <div>
                <span className="font-mono text-blue-600 dark:text-cyan-400 font-bold">#{history.length - idx}</span>
                <span className="text-slate-400 ml-2">{formatDateJakarta(h.requestedAt)}</span>
                {h.reason && <p className="text-[10px] text-slate-500 italic mt-0.5">Alasan: {h.reason}</p>}
              </div>
              <span className="rounded bg-blue-500/10 text-blue-600 dark:text-cyan-400 text-[10px] font-bold px-2 py-0.5 border border-blue-500/20">
                {h.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Minta Akun Baru (Request Replacement)?</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Kredensial Anda saat ini akan ditandai sebagai <span className="text-rose-500 font-bold">REPLACED</span>. Setelah replacement berhasil, Anda akan menerima akun baru dan cooldown replacement akan dimulai kembali.
                </p>
              </div>
            </div>

            {requiresReason && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">Pilih Alasan Kendala:</label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="CANNOT_LOGIN">Tidak Bisa Login (Wrong Password / Email)</option>
                  <option value="ACCOUNT_DISABLED">Akun Nonaktif / Disabled by Vendor</option>
                  <option value="ACCESS_EXPIRED_EARLY">Masa Akses Berakhir Lebih Awal</option>
                  <option value="FEATURE_NOT_WORKING">Fitur Premium Tidak Bekerja</option>
                  <option value="OTHER">Lainnya</option>
                </select>

                <textarea
                  placeholder="Catatan tambahan (opsional)..."
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRequestReplacement}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-xs font-black shadow-lg shadow-blue-500/20 transition"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Dapatkan Akun Baru</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
