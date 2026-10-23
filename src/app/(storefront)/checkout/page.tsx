'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Tag, ArrowRight, ShoppingBag, QrCode, Loader2, Coins, Sparkles, CheckCircle2, AlertCircle, UserPlus, LogIn } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatIDR } from '@/lib/utils/formatters';
import { isAllowedEmailDomain, EMAIL_DOMAIN_ERROR_MESSAGE } from '@/lib/auth/validation';
import { toast } from 'sonner';
import { CheckoutProgress } from '@/components/storefront/CheckoutProgress';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, couponCode, setCouponCode, clearCart } = useCart();

  const [guestEmail, setGuestEmail] = useState('');
  const [guestEmailConfirm, setGuestEmailConfirm] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [invitationEmail, setInvitationEmail] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Loyalty Coin states
  const [userCoins, setUserCoins] = useState<any | null>(null);
  const [requestedCoins, setRequestedCoins] = useState<number>(0);
  const [coinPreview, setCoinPreview] = useState<any | null>(null);
  const [isLoadingCoins, setIsLoadingCoins] = useState(false);

  // User session state
  const [loggedInUser, setLoggedInUser] = useState<any | null>(null);

  const cleanGuestEmail = guestEmail.trim();
  const isEmailValidDomain = cleanGuestEmail.includes('@') ? isAllowedEmailDomain(cleanGuestEmail) : null;

  // Load user session and coins in parallel on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [authRes, coinsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/account/coins'),
        ]);

        const [authJson, coinsJson] = await Promise.all([
          authRes.json().catch(() => null),
          coinsRes.json().catch(() => null),
        ]);

        if (authRes.ok && authJson?.success && authJson.user) {
          setLoggedInUser(authJson.user);
          if (authJson.user.name) setGuestName(authJson.user.name);
          if (authJson.user.email) setGuestEmail(authJson.user.email);
        }

        if (coinsRes.ok && coinsJson?.success && coinsJson.data) {
          setUserCoins(coinsJson.data);
        }
      } catch {}
    }
    fetchInitialData();
  }, []);

  // Update coin preview whenever items, couponCode, or requestedCoins change
  useEffect(() => {
    if (items.length === 0) return;

    const timer = setTimeout(async () => {
      setIsLoadingCoins(true);
      try {
        const res = await fetch('/api/checkout/coin-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
            couponCode,
            requestedCoins: Number(requestedCoins) || 0,
            email: cleanGuestEmail || undefined,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setCoinPreview(json.data);
        }
      } catch {} finally {
        setIsLoadingCoins(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [items, couponCode, requestedCoins, cleanGuestEmail]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center space-y-4">
        <ShoppingBag className="h-16 w-16 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">Keranjang Belanja Kosong</h2>
        <p className="text-xs text-slate-400">Silakan tambahkan produk ke keranjang terlebih dahulu.</p>
        <button
          onClick={() => router.push('/products')}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition"
        >
          Lihat Katalog Produk
        </button>
      </div>
    );
  }

  const handleApplyCoupon = async () => {
    if (!couponCode || !couponCode.trim()) return;
    setIsValidatingCoupon(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          subtotal,
          email: cleanGuestEmail || undefined,
        }),
      });

      const json = await res.json();
      if (json.success && json.valid) {
        setDiscountAmount(json.discountAmount);
        toast.success(`Kupon ${json.coupon.code} berhasil dipasang! Hemat ${formatIDR(json.discountAmount)}`);
      } else {
        setDiscountAmount(0);
        toast.error(json.error || 'Kode kupon tidak valid atau telah kedaluwarsa');
      }
    } catch {
      setDiscountAmount(0);
      toast.error('Gagal memvalidasi kupon promo');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleUseMaxCoins = () => {
    if (coinPreview?.maxUsableCoinsForUser) {
      setRequestedCoins(coinPreview.maxUsableCoinsForUser);
      toast.success(`Menggunakan ${coinPreview.maxUsableCoinsForUser.toLocaleString()} Store Coins!`);
    }
  };

  const cashPayableAmount = coinPreview ? coinPreview.cashPayableAmount : Math.max(0, subtotal - discountAmount);
  const coinDiscountAmount = coinPreview ? coinPreview.coinDiscountAmount : 0;
  const isFullCoinPayment = cashPayableAmount === 0 && coinDiscountAmount > 0;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestEmail || !guestName) {
      toast.error('Nama dan Email wajib diisi untuk pengiriman kredensial!');
      return;
    }

    if (!isAllowedEmailDomain(cleanGuestEmail)) {
      toast.error(EMAIL_DOMAIN_ERROR_MESSAGE);
      return;
    }

    // Manually delivered items are services: the admin needs a way to reach the buyer.
    if (items.some((i) => i.deliveryModel === 'MANUAL' || i.deliveryType === 'MANUAL') && guestPhone.trim().length < 9) {
      toast.error('Nomor WhatsApp wajib diisi untuk pemesanan jasa agar admin bisa menghubungi Anda.');
      return;
    }

    // A typo here would send the order link to a stranger, so guests retype their email.
    if (!loggedInUser && guestEmailConfirm.trim().toLowerCase() !== cleanGuestEmail.toLowerCase()) {
      toast.error('Konfirmasi email tidak sama. Periksa lagi penulisan email Anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestEmail: cleanGuestEmail,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          couponCode,
          requestedCoins: Number(requestedCoins) || 0,
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
            invitationEmail: i.deliveryModel === 'FAMILY_MEMBER' ? invitationEmail : undefined,
          })),
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Gagal membuat pesanan');
      }

      const { orderNumber, guestToken, cashPayableAmount: finalCash } = resData.data;

      if (guestToken) {
        localStorage.setItem(`order_token_${orderNumber}`, guestToken);
      }

      clearCart();
      if (isFullCoinPayment || finalCash === 0 || resData.data?.isFullCoinPayment) {
        toast.success('Pembayaran 100% Store Coin Berhasil! Lisensi/kredensial digital Anda telah siap.');
        router.push(`/payment/success?orderNumber=${orderNumber}${guestToken ? `&t=${encodeURIComponent(guestToken)}` : ''}`);
      } else {
        toast.success('Pesanan berhasil dibuat! Mengalihkan ke QRIS Pembayaran...');
        router.push(`/payment/${orderNumber}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan pada checkout');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      
      <CheckoutProgress currentStep={1} />

      <div className="text-center space-y-1">
        <h1 className="text-2xl font-extrabold text-white flex items-center justify-center gap-2">
          <QrCode className="h-6 w-6 text-cyan-400" />
          <span>Checkout &amp; Pembayaran Instan</span>
        </h1>
        <p className="text-xs text-slate-400">
          Dapatkan pengiriman lisensi digital instan otomatis setelah pembayaran terkonfirmasi.
        </p>
      </div>

      {/* Guest Checkout Info Alert */}
      {!loggedInUser && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-950/60 to-cyan-950/60 border border-cyan-500/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="font-bold text-xs text-white">Checkout Sebagai Pembeli Tamu (Guest)</h4>
              <p className="text-[11px] text-cyan-200/80">
                Anda dapat langsung checkout tanpa membuat akun. Atau masuk untuk menikmati cashback Store Coins!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => router.push('/login?redirect=/checkout')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Masuk</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/register?redirect=/checkout')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Daftar Akun</span>
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Customer Information & Store Coins */}
        <div className="md:col-span-7 space-y-6">
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
                <span>Informasi Pembeli / Kontak Digital</span>
              </h3>

              {loggedInUser ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Diisi Otomatis Dari Akun Member</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                  Mode Tamu
                </span>
              )}
            </div>

            {loggedInUser && (
              <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>
                  Halo <strong>{loggedInUser.name}</strong>! Data Anda diisi otomatis dari akun terverifikasi ({loggedInUser.email}).
                </span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Pengiriman Produk *</label>
                <input
                  type="email"
                  required
                  placeholder="nama@gmail.com / outlook / hotmail / yahoo"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className={`w-full rounded-xl bg-slate-950 border p-3 text-white placeholder-slate-500 focus:outline-none transition ${
                    isEmailValidDomain === false
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : isEmailValidDomain === true
                      ? 'border-emerald-500/80 focus:border-emerald-500'
                      : 'border-slate-800 focus:border-cyan-500'
                  }`}
                />
                {isEmailValidDomain === false && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>Gunakan email Gmail, Outlook, Hotmail, atau Yahoo.</span>
                  </p>
                )}
                {isEmailValidDomain === true && (
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Domain email didukung untuk pengiriman kredensial digital.</span>
                  </p>
                )}
                {isEmailValidDomain === null && (
                  <p className="text-[10px] text-slate-500 mt-1">Kredensial dan lisensi akan otomatis dikirimkan ke email ini.</p>
                )}
              </div>

              {!loggedInUser && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Ulangi Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="Ketik ulang email Anda"
                    value={guestEmailConfirm}
                    onChange={(e) => setGuestEmailConfirm(e.target.value)}
                    onPaste={(e) => e.preventDefault()}
                    className={`w-full rounded-xl bg-slate-950 border p-3 text-white placeholder-slate-500 focus:outline-none transition ${
                      guestEmailConfirm && guestEmailConfirm.trim().toLowerCase() !== cleanGuestEmail.toLowerCase()
                        ? 'border-rose-500/80 focus:border-rose-500'
                        : 'border-slate-800 focus:border-cyan-500'
                    }`}
                  />
                  {guestEmailConfirm && guestEmailConfirm.trim().toLowerCase() !== cleanGuestEmail.toLowerCase() && (
                    <p className="text-[11px] text-rose-400 mt-1">Email belum sama dengan kolom di atas.</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Nomor WhatsApp {items.some((i) => i.deliveryModel === 'MANUAL' || i.deliveryType === 'MANUAL') ? '*' : '(Opsional)'}
                </label>
                <input
                  type="tel"
                  placeholder="081234567890"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {items.some((i) => i.deliveryModel === 'FAMILY_MEMBER') && (
                <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-1.5">
                  <label className="block text-cyan-300 font-bold text-xs">
                    Email Akun untuk Undangan Family Group *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="email-family-anda@gmail.com"
                    value={invitationEmail}
                    onChange={(e) => setInvitationEmail(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none text-xs"
                  />
                  <p className="text-[10px] text-cyan-400">
                    Undangan keanggotaan family group akan dikirimkan langsung ke alamat email ini.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* STORE COINS REDEMPTION SECTION */}
          {loggedInUser && userCoins && userCoins.enabled ? (
            <div className="rounded-3xl glass-panel border border-amber-500/30 bg-slate-900/60 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <span>Gunakan {userCoins.coinName}</span>
                </h3>
                <span className="text-xs font-mono font-bold text-amber-400">
                  Tersedia: {userCoins.availableCoins.toLocaleString()} Coins
                </span>
              </div>

              {userCoins.availableCoins > 0 ? (
                <div className="space-y-3 text-xs">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max={coinPreview?.maxUsableCoinsForUser || userCoins.availableCoins}
                      placeholder="Masukkan jumlah coin..."
                      value={requestedCoins || ''}
                      onChange={(e) => setRequestedCoins(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleUseMaxCoins}
                      className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-2 text-xs font-black shrink-0 transition"
                    >
                      MAX COIN
                    </button>
                  </div>

                  {coinPreview && (
                    <div className="text-[11px] space-y-1 text-slate-400">
                      <p>
                        Maksimum yang bisa digunakan untuk pesanan ini:{' '}
                        <strong className="text-amber-400 font-mono">
                          {coinPreview.maxUsableCoinsForUser.toLocaleString()} Coins
                        </strong>{' '}
                        (-{formatIDR(coinPreview.maxUsableCoinsForUser * 10)})
                      </p>
                      {coinPreview.error === 'MINIMUM_COIN_REDEMPTION_NOT_MET' && (
                        <p className="text-rose-400 font-bold">
                          ⚠️ Minimal penukaran coin adalah 500 Coins.
                        </p>
                      )}
                      {coinPreview.error === 'COIN_COUPON_COMBINATION_NOT_ALLOWED' && (
                        <p className="text-rose-400 font-bold">
                          ⚠️ Coin tidak dapat digabungkan dengan kupon ini.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Anda belum memiliki Store Coins. Selesaikan pesanan untuk memperoleh 2% cashback coin!
                </p>
              )}
            </div>
          ) : !loggedInUser ? (
            <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/40 p-5 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                <Coins className="h-4 w-4" />
                <span>Store Coins Member Reward</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ingin diskon tambahan dan bonus cashback koin pada setiap pesanan?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/login?redirect=/checkout')}
                  className="text-cyan-400 hover:underline font-semibold"
                >
                  Masuk ke akun Anda
                </button>{' '}
                atau{' '}
                <button
                  type="button"
                  onClick={() => router.push('/register?redirect=/checkout')}
                  className="text-cyan-400 hover:underline font-semibold"
                >
                  Daftar Sekarang
                </button>
                .
              </p>
            </div>
          ) : null}
        </div>

        {/* Right Column: Order Summary & Payment Button */}
        <div className="md:col-span-5 space-y-6">
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/90 p-6 space-y-6 shadow-2xl">
            <h3 className="font-bold text-sm text-white">Ringkasan Pesanan</h3>

            {/* Items List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.variantId} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60">
                  <div className="space-y-0.5 max-w-[65%]">
                    <p className="font-bold text-white truncate">{item.productName}</p>
                    <p className="text-[11px] text-slate-400">{item.variantName} × {item.quantity}</p>
                  </div>
                  <span className="font-mono text-white font-bold">{formatIDR(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Promo Code Input */}
            <div className="space-y-2">
              <label className="block text-xs text-slate-300 font-medium">Kode Kupon Promo</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Contoh: HEMAT10"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white font-mono uppercase placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={isValidatingCoupon || !couponCode}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 px-3 py-2 text-xs font-bold shrink-0 transition border border-slate-700 disabled:opacity-50"
                >
                  {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pasang'}
                </button>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800 pt-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-white font-mono">{formatIDR(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Diskon Kupon</span>
                  <span className="font-mono">-{formatIDR(discountAmount)}</span>
                </div>
              )}

              {coinDiscountAmount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Diskon Store Coins</span>
                  <span className="font-mono">-{formatIDR(coinDiscountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold text-white border-t border-slate-800 pt-2">
                <span>Total Tagihan</span>
                <span className="text-base font-extrabold text-cyan-400 font-mono">
                  {formatIDR(cashPayableAmount)}
                </span>
              </div>

              {coinPreview && coinPreview.enabled && coinPreview.estimatedCoinsEarned > 0 && (
                <div className="flex justify-between items-center text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl mt-3 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>Potensi Cashback Coin</span>
                  </span>
                  <span className="font-mono text-amber-300">
                    +{coinPreview.estimatedCoinsEarned.toLocaleString()} Coins (+{formatIDR(coinPreview.estimatedCoinsEarned * (coinPreview.currencyValuePerCoin || 10))})
                  </span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || (cleanGuestEmail.length > 0 && isEmailValidDomain === false)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 py-3.5 text-xs font-bold text-slate-950 shadow-xl shadow-cyan-500/20 transition disabled:opacity-50 font-black tracking-wide"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFullCoinPayment ? (
                <>
                  <Coins className="h-4 w-4" />
                  <span>Bayar 100% Dengan Store Coins</span>
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4" />
                  <span>Lanjut ke Pembayaran QRIS</span>
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
