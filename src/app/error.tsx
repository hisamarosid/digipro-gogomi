'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, RotateCcw, Home, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalRouteError({ error, reset }: ErrorProps) {
  const [isAutoReloading, setIsAutoReloading] = useState(false);

  useEffect(() => {
    // 1. Log error for debugging
    console.error('[Gogomi Store] Client-side Exception Caught:', error);

    // 2. Detect ChunkLoadError / dynamic import failure (common after new production deployments)
    const errorMessage = (error?.message || '').toLowerCase();
    const isChunkOrDeployError =
      errorMessage.includes('loading chunk') ||
      errorMessage.includes('dynamically imported module') ||
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('load failed') ||
      errorMessage.includes('chunkloaderror');

    if (isChunkOrDeployError && typeof window !== 'undefined') {
      const lastReload = sessionStorage.getItem('gogomi_chunk_reload_ts');
      const now = Date.now();

      // Only auto-reload if we haven't reloaded in the last 15 seconds (prevents infinite reload loops)
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem('gogomi_chunk_reload_ts', now.toString());
        setIsAutoReloading(true);
        window.location.reload();
      }
    }
  }, [error]);

  const handleHardRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleClearCacheAndRefresh = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
      } catch (e) {
        console.warn('Failed to clear cache storage', e);
      }
      window.location.href = window.location.pathname + '?refresh=' + Date.now();
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
        {/* Glow Ambient Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Badge */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-slate-800 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            {isAutoReloading ? (
              <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-amber-400 animate-pulse" />
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
          </span>
        </div>

        {/* Title & Description */}
        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
          {isAutoReloading ? 'Memperbarui Halaman...' : 'Pembaruan Sistem / Kendala Sesi'}
        </h1>

        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          {isAutoReloading
            ? 'Versi aplikasi terbaru sedang dimuat otomatis ke browser Anda. Mohon tunggu sebentar...'
            : 'Website mungkin baru saja diperbarui atau koneksi browser terputus sesaat. Muat ulang halaman untuk mendapatkan versi terbaru secara mulus.'}
        </p>

        {/* Digest Code if available */}
        {error?.digest && (
          <div className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950/60 border border-slate-800/80 rounded-full text-xs text-slate-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>ID Referensi: {error.digest}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={handleHardRefresh}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-sm shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Muat Ulang Halaman
          </button>

          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Coba Lagi
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <button
            onClick={handleClearCacheAndRefresh}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Bersihkan Cache & Refresh
          </button>

          <a
            href="/"
            className="hover:text-cyan-400 transition-colors flex items-center gap-1 font-medium"
          >
            <Home className="w-3.5 h-3.5" />
            Ke Beranda
          </a>
        </div>
      </div>
    </div>
  );
}
