'use client';

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ExternalLink,
  HelpCircle,
  RefreshCw,
  Copy,
  CheckCircle2,
  Clock,
  ShieldCheck,
  X,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface VerificationCodeCardProps {
  orderItemId: string;
}

export function VerificationCodeCard({ orderItemId }: VerificationCodeCardProps) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [requesting, setRequesting] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [codeResult, setCodeResult] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch Verification Configuration on mount
  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/account/products/${orderItemId}/verification-code`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (isMounted && res.ok && json.success) {
          setConfig(json.data);
        }
      } catch {
        // Handle error gracefully
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchConfig();
    return () => {
      isMounted = false;
    };
  }, [orderItemId]);

  // Polling Effect when status is WAITING
  useEffect(() => {
    if (!activeRequestId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/account/products/${orderItemId}/verification-code?requestId=${activeRequestId}`,
          { cache: 'no-store' }
        );
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          const pollData = json.data;

          if (pollData.status === 'FOUND') {
            setCodeResult(pollData);
            setModalOpen(true);
            setActiveRequestId(null);
            setRequesting(false);
            toast.success('Kode verifikasi baru berhasil ditemukan! 🔐');
          } else if (pollData.status === 'FAILED' || pollData.status === 'EXPIRED') {
            setActiveRequestId(null);
            setRequesting(false);
            toast.error(pollData.message || 'Waktu pencarian kode habis. Silakan coba lagi.');
          }
        }
      } catch {
        // Silent catch for polling
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeRequestId, orderItemId]);

  const handleRequestCode = async () => {
    try {
      setRequesting(true);
      const res = await fetch(`/api/account/products/${orderItemId}/verification-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal meminta kode verifikasi.');
      }

      const data = json.data;

      if (data.status === 'CONCURRENCY_BLOCKED') {
        setRequesting(false);
        toast.error(data.message || 'Kode verifikasi sedang diproses untuk sesi lain.');
        return;
      }

      if (data.status === 'FOUND') {
        setCodeResult(data);
        setModalOpen(true);
        setRequesting(false);
        toast.success('Kode verifikasi baru ditemukan! 🔐');
        return;
      }

      if (data.status === 'WAITING' && data.requestId) {
        setActiveRequestId(data.requestId);
        toast.info('Mencari kode verifikasi terbaru dari layanan...');
        return;
      }

      setRequesting(false);
      toast.error(data.message || 'Tidak dapat memproses kode verifikasi.');
    } catch (err: any) {
      setRequesting(false);
      toast.error(err.message || 'Terjadi kesalahan saat meminta kode.');
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Kode verifikasi berhasil disalin!');
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading || !config || !config.verificationRequired) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
      <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-gradient-to-r dark:from-slate-950 dark:to-slate-900 border border-blue-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-blue-100 dark:bg-cyan-500/10 border border-blue-200 dark:border-cyan-500/30 flex items-center justify-center text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-xs">Kode Verifikasi Login</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-cyan-500/20 text-blue-700 dark:text-cyan-300 font-mono text-[9px] font-bold border border-blue-200 dark:border-cyan-500/30 uppercase">
                {config.verificationProvider || 'OTP'}
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
              {config.verificationMethod === 'EXTERNAL_INBOX_URL'
                ? 'Akun ini menggunakan inbox eksternal untuk menerima kode verifikasi.'
                : config.verificationMethod === 'MANUAL'
                ? 'Kode login membutuhkan bantuan Support Gogomi Store.'
                : 'Minta kode verifikasi terbaru jika aplikasi/web meminta kode saat login.'}
            </p>
          </div>
        </div>

        {/* Action Button Based on Method */}
        <div className="shrink-0">
          {config.verificationMethod === 'EXTERNAL_INBOX_URL' && config.verificationAccessUrl ? (
            <a
              href={config.verificationAccessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-black text-xs transition shadow-md shadow-blue-500/20 dark:shadow-cyan-500/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>BUKA INBOX</span>
            </a>
          ) : config.verificationMethod === 'MANUAL' ? (
            <a
              href="/help"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs transition border border-slate-200 dark:border-slate-700"
            >
              <HelpCircle className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" />
              <span>HUBUNGI SUPPORT</span>
            </a>
          ) : (
            <button
              type="button"
              disabled={requesting}
              onClick={handleRequestCode}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-md ${
                requesting
                  ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 dark:hover:from-cyan-400 dark:hover:to-blue-500 text-white dark:text-slate-950 shadow-blue-500/20 dark:shadow-cyan-500/20'
              }`}
            >
              {requesting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>MENCARI KODE...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>DAPATKAN KODE</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Code Result Modal Popup */}
      {modalOpen && codeResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl text-center relative">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/20 mx-auto">
              <ShieldCheck className="h-8 w-8 text-cyan-400" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-white text-base uppercase tracking-wide">🔐 KODE BARU DITEMUKAN</h3>
              <p className="text-xs text-slate-400">Kode verifikasi resmi dari layanan {config.verificationProvider || 'akun'}:</p>
            </div>

            {/* Code Highlight Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-2 shadow-inner">
              <div className="font-mono text-3xl font-black text-cyan-300 tracking-widest select-all">
                {codeResult.code || '----'}
              </div>
              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                <Clock className="h-3 w-3 text-cyan-400" />
                <span>Diterima beberapa detik yang lalu</span>
              </div>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={() => handleCopyCode(codeResult.code)}
              className={`w-full py-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg ${
                copied
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>KODE BERHASIL DISALIN!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>COPY KODE</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
