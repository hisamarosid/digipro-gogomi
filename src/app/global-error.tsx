'use client';

import React, { useEffect, useState } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [isAutoReloading, setIsAutoReloading] = useState(false);

  useEffect(() => {
    console.error('[Gogomi Store] Root Global Exception Caught:', error);

    // Auto reload for chunk/deploy errors
    const errorMessage = (error?.message || '').toLowerCase();
    const isChunkOrDeployError =
      errorMessage.includes('loading chunk') ||
      errorMessage.includes('dynamically imported module') ||
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('load failed') ||
      errorMessage.includes('chunkloaderror');

    if (isChunkOrDeployError && typeof window !== 'undefined') {
      const lastReload = sessionStorage.getItem('gogomi_global_reload_ts');
      const now = Date.now();

      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem('gogomi_global_reload_ts', now.toString());
        setIsAutoReloading(true);
        window.location.reload();
      }
    }
  }, [error]);

  const handleRefresh = () => {
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
        console.warn('Failed to clear caches', e);
      }
      window.location.href = '/?refresh=' + Date.now();
    }
  };

  return (
    <html lang="id" className="dark">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#020617',
          color: '#f8fafc',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '90%',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #1e293b',
            borderRadius: '24px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Logo / Icon */}
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 20px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(16, 185, 129, 0.2))',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}
          >
            {isAutoReloading ? '🔄' : '⚡'}
          </div>

          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 8px',
              letterSpacing: '-0.025em',
            }}
          >
            {isAutoReloading ? 'Memperbarui Aplikasi...' : 'Pembaruan Sistem / Sesi Browser'}
          </h1>

          <p
            style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#94a3b8',
              margin: '0 0 24px',
            }}
          >
            {isAutoReloading
              ? 'Pembaruan versi terbaru sedang disinkronkan. Halaman akan termuat ulang otomatis...'
              : 'Website baru saja diperbarui ke versi yang lebih baru. Silakan muat ulang halaman untuk melanjutkan transaksi dengan lancar.'}
          </p>

          {error?.digest && (
            <div
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                backgroundColor: '#020617',
                border: '1px solid #1e293b',
                borderRadius: '9999px',
                fontSize: '12px',
                color: '#64748b',
                fontFamily: 'monospace',
                marginBottom: '24px',
              }}
            >
              Kode: {error.digest}
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={handleRefresh}
              style={{
                flex: '1 1 180px',
                padding: '12px 20px',
                borderRadius: '12px',
                backgroundColor: '#06b6d4',
                color: '#020617',
                fontWeight: 600,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px 0 rgba(6, 182, 212, 0.39)',
              }}
            >
              🔄 Muat Ulang Halaman
            </button>

            <button
              onClick={() => reset()}
              style={{
                flex: '1 1 120px',
                padding: '12px 20px',
                borderRadius: '12px',
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                fontWeight: 500,
                fontSize: '14px',
                border: '1px solid #334155',
                cursor: 'pointer',
              }}
            >
              Coba Ulang
            </button>
          </div>

          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            <span
              onClick={handleClearCacheAndRefresh}
              style={{ cursor: 'pointer', color: '#38bdf8' }}
            >
              🧹 Bersihkan Cache & Refresh
            </span>
            <a href="/" style={{ color: '#38bdf8', textDecoration: 'none' }}>
              🏠 Ke Beranda
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
