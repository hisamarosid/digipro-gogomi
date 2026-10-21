'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Clock, CheckCircle2, RefreshCw, AlertTriangle, ArrowRight, Zap, Loader2, ShieldCheck, HelpCircle, ShieldAlert, Sparkles, ExternalLink, Copy, Check } from 'lucide-react';
import { formatIDR } from '@/lib/utils/formatters';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { CheckoutProgress } from '@/components/storefront/CheckoutProgress';

export function PaymentClient({ order, payment }: { order: any; payment: any }) {
  const router = useRouter();

  const [paymentStatus, setPaymentStatus] = useState<string>(order.paymentStatus);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(() => {
    // Initial calculation for immediate render
    const createdMs = payment?.createdAt ? new Date(payment.createdAt).getTime() : Date.now();
    let expiryMs = createdMs + 15 * 60 * 1000;
    if (payment?.expiryTime) {
      let raw = payment.expiryTime;
      if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw.trim())) {
        raw = `${raw.trim().replace(' ', 'T')}+07:00`;
      }
      const parsed = new Date(raw).getTime();
      if (!isNaN(parsed) && parsed <= createdMs + 20 * 60 * 1000 && parsed <= Date.now() + 20 * 60 * 1000) {
        expiryMs = parsed;
      }
    }
    return Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
  });
  const [isDownloadingQR, setIsDownloadingQR] = useState(false);
  const [generatedQrDataUrl, setGeneratedQrDataUrl] = useState<string>('');
  const [copiedAmount, setCopiedAmount] = useState(false);

  const qrString = payment?.qrString || '';

  // Generate high-resolution local QR Data URL on client
  useEffect(() => {
    // Verify QR string completeness (must contain EMVCo Tag 63 CRC16 checksum)
    const isQrStringComplete = qrString && qrString.length >= 195 && qrString.includes('6304');

    if (!qrString || (!isQrStringComplete && payment?.qrUrl)) {
      if (payment?.qrUrl) {
        setGeneratedQrDataUrl(payment.qrUrl);
      }
      return;
    }

    QRCode.toDataURL(qrString, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setGeneratedQrDataUrl(url))
      .catch(() => {
        setGeneratedQrDataUrl(
          payment?.qrUrl ||
          `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(qrString)}`
        );
      });
  }, [qrString, payment?.qrUrl]);

  // Polling payment status every 4 seconds
  useEffect(() => {
    if (paymentStatus === 'PAID' || paymentStatus === 'EXPIRED') return;

    const checkStatus = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      try {
        const res = await fetch(`/api/orders/${order.orderNumber}/payment-status`);
        const data = await res.json();
        if (data.success && data.status) {
          if (data.status === 'PAID') {
            setPaymentStatus('PAID');
            toast.success('Pembayaran Berhasil Diterima!');
            router.push(`/payment/success?orderNumber=${order.orderNumber}`);
          } else if (data.status === 'EXPIRED') {
            setPaymentStatus('EXPIRED');
          }
        }
      } catch { }
    };

    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, [order.orderNumber, paymentStatus, router]);

  // Accurate 15-Minute countdown timer calculation
  useEffect(() => {
    const createdMs = payment?.createdAt ? new Date(payment.createdAt).getTime() : Date.now();
    let expiryMs = createdMs + 15 * 60 * 1000;

    if (payment?.expiryTime) {
      let raw = payment.expiryTime;
      if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw.trim())) {
        raw = `${raw.trim().replace(' ', 'T')}+07:00`;
      }
      const parsed = new Date(raw).getTime();
      // If parsed timestamp is valid and within normal range, use it; otherwise strictly 15 mins from created
      if (!isNaN(parsed) && parsed <= createdMs + 20 * 60 * 1000 && parsed <= Date.now() + 20 * 60 * 1000) {
        expiryMs = parsed;
      }
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
      setTimeLeftSeconds(diff);
      if (diff <= 0) {
        setPaymentStatus('EXPIRED');
        fetch(`/api/orders/${order.orderNumber}/payment-status`).catch(() => { });
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [payment?.expiryTime, payment?.createdAt, order.orderNumber]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // High-Resolution Download QRIS Handler
  const handleDownloadQRIS = async () => {
    setIsDownloadingQR(true);
    try {
      const isStaticFallback = payment?.provider === 'AUTOGOPAY_GOPAY_STATIC';
      const fileName = isStaticFallback 
        ? `QRIS-GogoGaming-${order.orderNumber}.jpg`
        : `Gogomi-QRIS-${order.orderNumber}.png`;
      let downloadUrl = isStaticFallback ? '/qris-gogo-gaming.jpg' : generatedQrDataUrl;

      if (!downloadUrl && !isStaticFallback) {
        downloadUrl = await QRCode.toDataURL(qrString, {
          width: 600,
          margin: 2,
          errorCorrectionLevel: 'M',
        });
      }

      // Create a temporary link element to trigger browser download
      const link = document.createElement('a');
      link.href = downloadUrl || '/qris-gogo-gaming.jpg';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('QRIS berhasil disimpan.');
    } catch (err: any) {
      toast.error('Gagal mengunduh QRIS. Anda dapat melakukan screenshot kode QR.');
    } finally {
      setIsDownloadingQR(false);
    }
  };

  if (paymentStatus === 'PAID') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <CheckoutProgress currentStep={3} />
        <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto animate-bounce mt-6" />
        <h2 className="text-xl font-bold text-white">Pembayaran Sukses!</h2>
        <p className="text-xs text-slate-400">Pesanan Anda telah dikonfirmasi dan produk sedang diproses.</p>
        <button
          onClick={() => router.push(`/payment/success?orderNumber=${order.orderNumber}`)}
          className="rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20"
        >
          Lihat Produk Saya
        </button>
      </div>
    );
  }

  if (paymentStatus === 'EXPIRED' || paymentStatus === 'CANCELLED' || paymentStatus === 'FAILED') {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center space-y-6 animate-in fade-in duration-300">
        <CheckoutProgress currentStep={2} />

        <div className="mx-auto h-20 w-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <AlertTriangle className="h-10 w-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">
            {paymentStatus === 'EXPIRED'
              ? 'Waktu Pembayaran Kedaluwarsa'
              : paymentStatus === 'CANCELLED'
                ? 'Pesanan Dibatalkan'
                : 'Pembayaran Gagal'}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Batas waktu pembayaran 15 menit untuk pesanan <strong className="text-white font-mono">{order.orderNumber}</strong> telah berakhir. Koin atau stok yang sempat tertahan telah otomatis dikembalikan.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 text-left space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Status Pesanan:</span>
            <span className="font-bold text-rose-400 uppercase bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full text-[10px]">
              {paymentStatus}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Stok &amp; Store Coins:</span>
            <span className="font-bold text-emerald-400 text-[11px]">Dikembalikan (Released)</span>
          </div>
        </div>

        <button
          onClick={() => router.push('/products')}
          className="w-full rounded-2xl bg-blue-600 hover:bg-blue-500 py-3.5 text-xs font-black text-white shadow-xl shadow-blue-500/20 transition flex items-center justify-center gap-2"
        >
          <span>Buat Pesanan Baru</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const finalPayable = order.cashPayableAmount !== undefined ? order.cashPayableAmount : order.grandTotal;

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-6 space-y-6">

      {/* 1. Stepper Header */}
      <CheckoutProgress currentStep={2} />

      {/* 2. Order Number & Title Header */}
      <div className="text-center space-y-1">
        <span className="inline-block rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400 px-3 py-1 mb-1 shadow-sm">
          Nomor Pesanan: {order.orderNumber}
        </span>
        <h1 className="text-2xl font-extrabold text-white">Pembayaran QRIS</h1>
        <p className="text-xs text-slate-400">Pindai kode QRIS di bawah menggunakan GoPay, OVO, Dana, BCA, atau m-Banking apapun.</p>
      </div>

      {/* Main Payment Card Hierarchy */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 text-center space-y-6 shadow-2xl">

        {/* 3. Total Pembayaran Display */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="space-y-1.5 text-xs text-slate-400 border-b border-slate-800 pb-3">
            <div className="flex justify-between">
              <span>Subtotal Pesanan</span>
              <span className="text-white font-mono">{formatIDR(order.totalAmount)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Diskon Kupon Promo</span>
                <span className="font-mono">-{formatIDR(order.discountAmount)}</span>
              </div>
            )}
            {order.coinDiscountAmount > 0 && (
              <div className="flex justify-between text-amber-400 font-bold">
                <span>Potongan Store Coins ({(order.coinUsed || 0).toLocaleString()} Coins)</span>
                <span className="font-mono">-{formatIDR(order.coinDiscountAmount)}</span>
              </div>
            )}
          </div>

          <div className="pt-1 space-y-2">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-medium">Total Pembayaran</span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-black text-cyan-400 font-mono">
                {formatIDR(finalPayable)}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(finalPayable.toString());
                    setCopiedAmount(true);
                    toast.success(`Nominal ${formatIDR(finalPayable)} berhasil disalin!`);
                    setTimeout(() => setCopiedAmount(false), 2500);
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white hover:border-cyan-500 transition shadow cursor-pointer"
                title="Salin Angka Pembayaran"
              >
                {copiedAmount ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[11px] text-emerald-400">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="text-[11px]">Salin</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] leading-relaxed">
              <span className="font-bold">⚠️ PENTING:</span> Pastikan transfer/bayar <strong>PAS {formatIDR(finalPayable)}</strong> (sampai 3 digit terakhir) agar pesanan terdeteksi otomatis dalam 3-5 detik.
            </div>

            {order.coinsEarned > 0 && (
              <div className="inline-flex items-center justify-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 py-1.5 px-3 rounded-xl mt-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Cashback setelah pembayaran: +{(order.coinsEarned || 0).toLocaleString()} Coins</span>
              </div>
            )}
          </div>
        </div>

        {/* 4. QRIS Display */}
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-3xl max-w-xs mx-auto shadow-xl ring-4 ring-cyan-500/10">
          {payment?.provider === 'AUTOGOPAY_GOPAY_STATIC' ? (
            <img
              src="/qris-gogo-gaming.jpg"
              alt={`QRIS Resmi GOGO GAMING - Order ${order.orderNumber}`}
              className="w-64 max-h-80 object-contain rounded-xl shadow-sm"
            />
          ) : (generatedQrDataUrl || payment?.qrUrl) ? (
            <img
              src={generatedQrDataUrl || payment?.qrUrl}
              alt={`QRIS Gogomi Store ${order.orderNumber}`}
              className="w-56 h-56 object-contain"
              onError={(e) => {
                if (payment?.qrUrl && generatedQrDataUrl && (e.currentTarget.src === payment.qrUrl)) {
                  e.currentTarget.src = generatedQrDataUrl;
                }
              }}
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
          )}
          <div className="mt-2 text-center">
            <span className="text-[10px] text-slate-800 font-bold block">
              {payment?.provider === 'AUTOGOPAY_GOPAY_STATIC' ? 'GOGO GAMING • QRIS RESMI TERVERIFIKASI' : 'GOGOMI DIGITAL STORE'}
            </span>
          </div>
        </div>

        {/* 5. Countdown & Status Pembayaran */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-center gap-2 font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 py-2.5 px-3 rounded-xl">
            <Clock className="h-4 w-4 animate-pulse" />
            <span>Sisa Waktu: {formatCountdown(timeLeftSeconds)}</span>
          </div>
          <div className="flex items-center justify-center gap-2 font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 py-2.5 px-3 rounded-xl">
            <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
            <span>Menunggu Pembayaran</span>
          </div>
        </div>

        {/* 6. Customer Actions (Download QRIS & Direct Payment Link) */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleDownloadQRIS}
            disabled={isDownloadingQR}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 py-3 text-xs font-bold text-slate-950 transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {isDownloadingQR ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Download QRIS</span>
          </button>

          {payment?.checkoutUrl && (
            <a
              href={payment.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 transition border border-slate-700/80"
            >
              <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
              <span>Buka di Halaman AutoGoPay</span>
            </a>
          )}
        </div>

        {/* 7. Help & Security Section */}
        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-2 text-left">
          <div className="flex items-start gap-2 text-slate-300">
            <HelpCircle className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>Cara Membayar:</strong> Buka aplikasi BCA Mobile / GoPay / OVO / Dana / ShopeePay, pilih menu <em>Scan QR</em> / <em>Unggah dari Galeri</em>, lalu konfirmasi pembayaran sesuai nominal yang tertera.
            </span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Garansi 100% Produk Legal & Pengiriman Otomatis Setelah Bayar</span>
          </div>
        </div>

      </div>
    </div>
  );
}
