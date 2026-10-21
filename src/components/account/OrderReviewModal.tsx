'use client';

import React, { useState, useEffect } from 'react';
import { Star, X, Loader2, CheckCircle2, MessageSquare, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface OrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  existingReview?: {
    id: string;
    rating: number;
    title: string;
    comment: string;
  } | null;
  onSuccess?: (reviewData: any) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Sangat Buruk',
  2: 'Kurang Memuaskan',
  3: 'Cukup Baik',
  4: 'Bagus & Berfungsi',
  5: 'Sangat Bagus & Instan! (Recommended)',
};

export function OrderReviewModal({
  isOpen,
  onClose,
  productId,
  productName,
  existingReview,
  onSuccess,
}: OrderReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating || 5);
      setTitle(existingReview.title || '');
      setComment(existingReview.comment || '');
    } else {
      setRating(5);
      setTitle('');
      setComment('');
    }
  }, [existingReview, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!comment || comment.trim().length === 0) {
      toast.error('Isi komentar ulasan tidak boleh kosong');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          title: title.trim(),
          comment: comment.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal mengirim ulasan');
      }

      toast.success(existingReview ? 'Ulasan Anda berhasil diperbarui!' : 'Terima kasih! Ulasan Anda berhasil dikirim.');
      if (onSuccess) {
        onSuccess(json.data);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan ulasan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeStars = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-amber-400" />
            <h3 className="font-bold text-white text-sm">
              {existingReview ? 'Edit Ulasan Produk' : 'Beri Rating & Ulasan Produk'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Product Info */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <p className="text-[10px] uppercase font-bold text-slate-500">Produk yang Diulas</p>
          <p className="text-xs font-bold text-white line-clamp-1 mt-0.5">{productName}</p>
        </div>

        {/* Interactive Star Rating Selector */}
        <div className="space-y-2 text-center py-2 bg-slate-950/40 rounded-2xl border border-slate-800/60">
          <label className="block text-xs font-bold text-slate-300">
            Pilih Rating Bintang *
          </label>

          <div className="flex items-center justify-center gap-2 py-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-125 focus:outline-none"
              >
                <Star
                  className={`h-7 w-7 transition-colors ${
                    star <= activeStars
                      ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                      : 'text-slate-700'
                  }`}
                />
              </button>
            ))}
          </div>

          <p className="text-xs font-bold text-amber-400 h-4">
            {RATING_LABELS[activeStars] || ''}
          </p>
        </div>

        {/* Title Input */}
        <div className="space-y-1.5 text-xs">
          <label className="block text-slate-300 font-bold">Judul Ulasan (Opsional)</label>
          <input
            type="text"
            placeholder="Contoh: Proses instan & kredensial langsung aktif!"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Comment Input */}
        <div className="space-y-1.5 text-xs">
          <label className="block text-slate-300 font-bold">Pengalaman &amp; Catatan Ulasan *</label>
          <textarea
            rows={4}
            required
            placeholder="Tuliskan pengalaman Anda menggunakan produk digital ini, kemudahan klaim, atau layanan seller..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Privacy Note */}
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-400" />
          <span>Nama akun Anda disensor sebagian secara otomatis di ulasan publik <strong className="font-mono text-white">(e.g. Nd***ok)</strong> demi privasi.</span>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-800 transition"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyimpan Ulasan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{existingReview ? 'Perbarui Ulasan' : 'Kirim Ulasan Produk'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
