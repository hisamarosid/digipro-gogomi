'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  Zap,
  Star,
  ArrowRight,
  Check,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  BadgeCheck,
  Send,
  Lock,
  ImageIcon,
  Bell,
  MessageCircle,
} from 'lucide-react';
import { formatIDR, maskCustomerName } from '@/lib/utils/formatters';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

export function ProductDetailClient({ product }: { product: any }) {
  const router = useRouter();
  const { addItem } = useCart();

  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0]?.id || '');
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  // Gallery Description Images (Gambar Deskripsi / Banner)
  const descriptionImages: string[] = product.gallery && product.gallery.length > 0
    ? product.gallery
    : (product.thumbnail ? [product.thumbnail] : []);

  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const activeMainImage = descriptionImages[activeImageIndex] || product.thumbnail;

  // Review states
  const [reviews, setReviews] = useState<any[]>(product.reviews || []);
  const [userEligible, setUserEligible] = useState<boolean>(false);
  const [userReview, setUserReview] = useState<any>(null);
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [titleInput, setTitleInput] = useState<string>('');
  const [commentInput, setCommentInput] = useState<string>('');
  const [maskNamePreference, setMaskNamePreference] = useState<boolean>(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [hoverRating, setHoverRating] = useState<number>(0);

  const selectedVariant = product.variants.find((v: any) => v.id === selectedVariantId) || product.variants[0];

  const stockCount = selectedVariant?.availableStock ?? (selectedVariant?.inventoryItems?.length || 0);
  const isOutOfStock = stockCount === 0 && selectedVariant?.deliveryModel !== 'DOWNLOAD' && selectedVariant?.deliveryModel !== 'MANUAL';

  const viewsCount = product.viewCount || 1;

  // Calculate rating stats
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : '5.0';

  useEffect(() => {
    async function loadReviewsAndEligibility() {
      try {
        const res = await fetch(`/api/products/${product.id}/reviews`);
        const json = await res.json();
        if (json.success) {
          setReviews(json.data.reviews || []);
          setUserEligible(json.data.userEligible);
          if (json.data.userReview) {
            setUserReview(json.data.userReview);
            setRatingInput(json.data.userReview.rating);
            setTitleInput(json.data.userReview.title || '');
            setCommentInput(json.data.userReview.comment || '');
          }
        }
      } catch (err) {
        console.error('Failed to load review details:', err);
      }
    }
    loadReviewsAndEligibility();
  }, [product.id]);

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    addItem({
      variantId: selectedVariant.id,
      productName: product.name,
      variantName: selectedVariant.name,
      price: selectedVariant.price,
      quantity: 1,
      thumbnail: product.thumbnail,
      sku: selectedVariant.sku,
      deliveryType: selectedVariant.deliveryType,
      deliveryModel: selectedVariant.deliveryModel || 'DEDICATED_ACCOUNT',
    });
    toast.success('Produk berhasil ditambahkan ke keranjang!');
  };

  const handleBuyNow = () => {
    if (!selectedVariant) return;
    addItem({
      variantId: selectedVariant.id,
      productName: product.name,
      variantName: selectedVariant.name,
      price: selectedVariant.price,
      quantity: 1,
      thumbnail: product.thumbnail,
      sku: selectedVariant.sku,
      deliveryType: selectedVariant.deliveryType,
      deliveryModel: selectedVariant.deliveryModel || 'DEDICATED_ACCOUNT',
    }, false);
    router.push('/checkout');
  };

  const handleJoinWaitlist = async () => {
    if (!selectedVariant) return;
    try {
      const res = await fetch('/api/account/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productVariantId: selectedVariant.id }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Berhasil mendaftar waitlist! Anda akan dinotifikasi saat stok restock.');
      } else {
        toast.error(json.error || 'Gagal mendaftar waitlist. Silakan login terlebih dahulu.');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi jaringan');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) {
      toast.error('Isi ulasan tidak boleh kosong');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: ratingInput,
          title: titleInput,
          comment: commentInput,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(json.message || 'Ulasan berhasil disimpan!');
        setUserReview(json.data);
        const refRes = await fetch(`/api/products/${product.id}/reviews`);
        const refJson = await refRes.json();
        if (refJson.success) {
          setReviews(refJson.data.reviews || []);
        }
      } else {
        toast.error(json.error || 'Gagal mengirim ulasan');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 pb-28 lg:pb-8">
      
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/" className="hover:text-blue-600 dark:hover:text-white transition">Beranda</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-blue-600 dark:hover:text-white transition">Produk</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link href={`/products?category=${product.category.slug}`} className="hover:text-blue-600 dark:hover:text-white transition">{product.category.name}</Link>
            <span>/</span>
          </>
        )}
        <span className="text-white font-medium line-clamp-1">{product.name}</span>
      </nav>

      {/* Top Product Header (Logo App + Title + Views & Rating Pills) */}
      <div className="flex items-center gap-4 sm:gap-6 pt-2">
        <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 shadow-md flex items-center justify-center">
          {product.thumbnail ? (
            <img
              src={product.thumbnail}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-900 text-blue-600 dark:text-cyan-400 font-black text-2xl">
              {product.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Title & Badges */}
        <div className="space-y-2 min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight line-clamp-2">
            {product.name}
          </h1>

          {/* Badges Row (Rating/Comments, Terjual, Category) */}
          <div className="flex flex-wrap items-center gap-2 text-xs">

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <span>{avgRating} ({totalReviews})</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold">
              <ShoppingBag className="h-3.5 w-3.5 text-amber-500" />
              <span>{(product.soldCount || 0).toLocaleString('id-ID')} Terjual</span>
            </div>

            {product.category && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                <BadgeCheck className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" />
                <span>{product.category.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <hr className="border-slate-800/80 my-4" />

      {/* Main Grid: Gallery & Purchase Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Gallery, Details, and Reviews */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Active Banner Preview */}
          <div className="space-y-3">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl glass-panel border border-slate-800 bg-slate-900 shadow-xl">
              {activeMainImage ? (
                <img
                  src={activeMainImage}
                  alt={product.name}
                  className="h-full w-full object-cover transition-all duration-300"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-slate-500 font-bold">
                  Tidak ada gambar deskripsi
                </div>
              )}
            </div>

            {/* Thumbnail Carousel */}
            {descriptionImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                {descriptionImages.map((imgUrl, idx) => {
                  const isActive = idx === activeImageIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative h-16 w-24 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${
                        isActive
                          ? 'border-blue-600 dark:border-cyan-400 shadow-lg shadow-blue-500/20 scale-105'
                          : 'border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Product Descriptions */}
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="font-extrabold text-white text-base">Deskripsi &amp; Fitur Produk</h3>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{product.fullDesc}</p>
          </div>

          {/* Ratings & Reviews Section */}
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                  <span>Ulasan &amp; Rating Pembeli</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ulasan asli dari pembeli terverifikasi
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-amber-400">{avgRating}</div>
                <div className="text-[11px] text-slate-400">dari 5 bintang</div>
              </div>
            </div>

            {/* Review Form */}
            {userEligible ? (
              <form onSubmit={handleSubmitReview} className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-blue-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4" />
                    <span>{userReview ? 'Edit Ulasan Anda' : 'Tulis Ulasan Produk Ini'}</span>
                  </h4>
                  <span className="text-[10px] bg-blue-500/20 text-blue-600 dark:text-cyan-400 px-2.5 py-0.5 rounded-full font-bold">
                    Pembeli Terverifikasi
                  </span>
                </div>

                {/* Rating Star Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pilih Rating:</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRatingInput(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 focus:outline-none transition transform hover:scale-125"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            (hoverRating || ratingInput) >= star
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold text-amber-400">
                      {hoverRating || ratingInput} / 5 Bintang
                    </span>
                  </div>
                </div>

                {/* Review Title Input */}
                <div>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="Judul ulasan (opsional, misal: Sangat memuaskan!)"
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Review Comment Input */}
                <div>
                  <textarea
                    rows={3}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Tulis ulasan pengalaman Anda menggunakan produk ini..."
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Privacy & Name Sensor Option */}
                <div className="flex items-center gap-2 pt-0.5 pb-1">
                  <input
                    type="checkbox"
                    id="maskNameCheck"
                    checked={maskNamePreference}
                    onChange={(e) => setMaskNamePreference(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                  />
                  <label htmlFor="maskNameCheck" className="cursor-pointer select-none text-[11px] text-slate-300">
                    Sensor / Samarkan nama saya pada ulasan publik <span className="text-cyan-400 font-mono font-bold">(Contoh: Nd***ok)</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-5 py-2.5 transition shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmittingReview ? 'Mengirim...' : userReview ? 'Perbarui Ulasan' : 'Kirim Ulasan'}</span>
                </button>
              </form>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex items-center gap-3 text-xs text-slate-400">
                <Lock className="h-5 w-5 text-slate-500 shrink-0" />
                <p>
                  Hanya pembeli terverifikasi yang telah menyelesaikan pembelian produk ini yang dapat memberikan ulasan dan rating.
                </p>
              </div>
            )}

            {/* List of Approved Reviews */}
            <div className="space-y-4 pt-2">
              {reviews.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Belum ada ulasan untuk produk ini. Jadi yang pertama membeli dan berikan ulasan!
                </div>
              ) : (
                reviews.map((rev: any) => (
                  <div key={rev.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-extrabold text-blue-600 dark:text-cyan-400 text-xs">
                          {(rev.user?.name || 'Customer').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-white block">
                            {maskCustomerName(rev.user?.name)}
                          </span>
                          <span className="text-[10px] text-blue-600 dark:text-cyan-400 font-semibold flex items-center gap-1">
                            <BadgeCheck className="h-3 w-3" /> Pembeli Terverifikasi
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${
                              s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {rev.title && <h5 className="text-xs font-extrabold text-slate-200">{rev.title}</h5>}
                    <p className="text-xs text-slate-300 leading-relaxed">{rev.comment}</p>
                    <span className="text-[10px] text-slate-500 block text-right">
                      {new Date(rev.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Pricing, Purchase Card, & FAQ */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-6 sticky top-24">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-cyan-400 tracking-wider">
                {product.category?.name || 'Digital Product'}
              </span>
              <p className="text-xs text-slate-400 mt-1">{product.shortDesc}</p>
            </div>

            {/* Variant Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300">Pilih Varian Produk:</label>
              <div className="space-y-2">
                {product.variants.map((v: any) => {
                  const isSelected = v.id === selectedVariantId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs">{v.name}</p>
                        <p className="text-[10px] text-slate-400">Garansi: {v.warrantyDays || 30} Hari</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white text-sm">{formatIDR(v.price)}</p>
                        {v.compareAtPrice && v.compareAtPrice > v.price && (
                          <p className="text-[10px] text-slate-500 line-through">{formatIDR(v.compareAtPrice)}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price & Stock Display */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Harga Saat Ini</span>
                <p className="text-2xl font-black text-white">{formatIDR(selectedVariant?.price || 0)}</p>
              </div>

              <div>
                {isOutOfStock ? (
                  <span className="rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold px-3 py-1">
                    Stok Habis
                  </span>
                ) : (
                  <span className="rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-cyan-400 text-[11px] font-bold px-3 py-1 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Ready Stock
                  </span>
                )}
              </div>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden lg:block space-y-3">
              {isOutOfStock ? (
                <button
                  onClick={handleJoinWaitlist}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 py-3.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition"
                >
                  <Bell className="h-4 w-4" />
                  <span>NOTIFY ME (Ingatkan Saat Restock)</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleBuyNow}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition"
                  >
                    <span>Beli Sekarang (QRIS Instan)</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    onClick={handleAddToCart}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-3 text-xs font-bold text-slate-100 transition"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>+ Keranjang Belanja</span>
                  </button>
                </>
              )}
            </div>

            {/* Trust Badges & Replacement Protection */}
            <div className="border-t border-slate-800/80 pt-4 space-y-2.5 text-[11px] text-slate-400">
              {selectedVariant?.replacementEnabled && (
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-cyan-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-blue-600 dark:text-cyan-400">
                    <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
                    <span>Auto Replacement Protection</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-300 font-medium">
                    <li>• Replacement tersedia setiap {selectedVariant.replacementCooldownHours || 72} jam</li>
                    <li>
                      • Masa berlaku: {selectedVariant.replacementValidityType === 'SUBSCRIPTION' ? 'Selama subscription aktif' : selectedVariant.replacementValidityType === 'WARRANTY' ? `Selama garansi (${selectedVariant.warrantyDays || 30} hari)` : `${selectedVariant.replacementValidityDays || 30} hari setelah pembelian`}
                    </li>
                    <li>• Mode replacement: {selectedVariant.replacementMode === 'AUTO' ? 'Otomatis Instan' : 'Persetujuan Admin'}</li>
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
                <span>Pengiriman Otomatis &amp; Instan via Web &amp; Email</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
                <span>Garansi Penggantian {selectedVariant?.warrantyDays || 30} Hari</span>
              </div>
            </div>

            {/* Product FAQ Accordion Section */}
            {product.faqs && product.faqs.length > 0 && (
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
                  <span>Pertanyaan Sering Diajukan (FAQ)</span>
                </h3>
                <div className="space-y-2.5">
                  {product.faqs.map((faq: any) => {
                    const isOpen = openFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden transition"
                      >
                        <button
                          onClick={() => toggleFaq(faq.id)}
                          className="w-full flex items-center justify-between p-3 text-left font-bold text-xs text-white hover:bg-slate-800/80 transition"
                        >
                          <span>{faq.question}</span>
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4 text-blue-600 dark:text-cyan-400 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                        </button>

                        {isOpen && (
                          <div className="px-3 pb-3 pt-1 text-xs text-slate-300 border-t border-slate-800/80 bg-slate-900/40">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* 📱 MOBILE STICKY BOTTOM ACTION BAR (Shopee / Tokopedia Style E-Commerce Floating Bar) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 p-3 bg-slate-900/95 border-t border-slate-800/90 backdrop-blur-md shadow-2xl flex items-center justify-between gap-2.5">
        {/* Support / CS Chat Button */}
        <Link
          href="/account/support"
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0 w-12 h-12"
          title="Bantuan CS"
        >
          <MessageCircle className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
          <span className="text-[9px] font-bold mt-0.5">Chat</span>
        </Link>

        {isOutOfStock ? (
          <button
            onClick={handleJoinWaitlist}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 py-3 text-xs font-extrabold text-white shadow-md transition"
          >
            <Bell className="h-4 w-4" />
            <span>Ingatkan Restock</span>
          </button>
        ) : (
          <>
            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 py-3 text-xs font-extrabold transition border border-slate-700/60"
            >
              <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
              <span>+ Keranjang</span>
            </button>

            {/* Buy Now Button */}
            <button
              onClick={handleBuyNow}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white py-3 text-xs font-extrabold transition shadow-lg shadow-blue-600/30"
            >
              <span>Beli Sekarang</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

    </div>
  );
}
