'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Key, Eye, EyeOff, Copy, ShieldCheck, Download, Star, BookOpen, FileText, ExternalLink, Clock, AlertTriangle, ShoppingBag } from 'lucide-react';
import { FormattedCredentialView, extractFirstUrl } from '@/components/common/FormattedCredentialView';
import { formatDateJakarta } from '@/lib/utils/formatters';
import { toast } from 'sonner';
import { ReplacementProtectionCard } from '@/components/account/ReplacementProtectionCard';
import { OrderReviewModal } from '@/components/account/OrderReviewModal';
import { ProductGuideViewerModal } from '@/components/account/ProductGuideViewerModal';
import { FirstTimeGuideOrchestrator } from '@/components/account/FirstTimeGuideOrchestrator';
import { VerificationCodeCard } from '@/components/account/VerificationCodeCard';

export function ProductCredentialsClient({
  fulfillments,
  existingReviews = [],
}: {
  fulfillments: any[];
  existingReviews?: any[];
}) {
  const { t } = useLanguage();
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [reviews, setReviews] = useState<any[]>(existingReviews);

  // Guide Viewer Modal State
  const [guideViewerOpen, setGuideViewerOpen] = useState(false);
  const [selectedGuideOrderItemId, setSelectedGuideOrderItemId] = useState<string>('');
  const [selectedGuideTab, setSelectedGuideTab] = useState<'tutorial' | 'terms'>('tutorial');

  // Review Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleOpenGuide = (orderItemId: string, tab: 'tutorial' | 'terms') => {
    setSelectedGuideOrderItemId(orderItemId);
    setSelectedGuideTab(tab);
    setGuideViewerOpen(true);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Kredensial disalin ke clipboard');
  };

  const handleOpenReview = (productId: string, productName: string) => {
    setSelectedProduct({ id: productId, name: productName });
    setModalOpen(true);
  };

  const handleReviewSuccess = (updatedReview: any) => {
    setReviews((prev) => {
      const idx = prev.findIndex((r) => r.id === updatedReview.id || r.productId === updatedReview.productId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedReview;
        return next;
      }
      return [...prev, updatedReview];
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Key className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
          <span>{t('acc_prod_title')}</span>
        </h1>
        <p className="text-xs text-slate-400">{t('acc_prod_subtitle')}</p>
      </div>

      {fulfillments.length === 0 ? (
        <div className="rounded-3xl glass-panel border border-slate-800 p-12 text-center text-slate-400 text-xs">
          {t('acc_prod_empty')}
        </div>
      ) : (
        <div className="space-y-4">
          {fulfillments.map((f) => {
            const isRevealed = revealedIds[f.id];
            const payloadText = f.payloadRevealed || 'No payload snapshot available';
            const productId = f.orderItem?.variant?.productId;
            const existingReview = reviews.find((r) => r.productId === productId);
            const isExpired = f.isExpired;

            return (
              <div key={f.id} className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-white">{f.orderItem.productName}</h3>
                    <p className="text-xs text-blue-600 dark:text-cyan-400 font-semibold">{f.orderItem.variantName}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Order: {f.orderItem.order.orderNumber}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {f.isPendingReplacement ? (
                      <span className="rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold px-2.5 py-0.5 flex items-center gap-1 animate-pulse">
                        <Clock className="h-3 w-3" />
                        <span>Penggantian Akun Diproses</span>
                      </span>
                    ) : isExpired ? (
                      <span className="rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold px-2.5 py-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Masa Aktif Berakhir</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold px-2.5 py-0.5">
                        {f.deliveryType}
                      </span>
                    )}

                    {/* RATING & REVIEW CTA BUTTON */}
                    {productId && (
                      <div>
                        {existingReview ? (
                          <button
                            type="button"
                            onClick={() => handleOpenReview(productId, f.orderItem.productName)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-[10px] font-bold transition"
                          >
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span>{existingReview.rating}/5 (Edit Ulasan)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenReview(productId, f.orderItem.productName)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black shadow transition"
                          >
                            <Star className="h-3 w-3 fill-slate-950 text-slate-950" />
                            <span>+ Beri Rating</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pending Replacement Notice */}
                {f.isPendingReplacement && (
                  <div className="pt-2">
                    <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Permintaan Penggantian Akun Sedang Diproses</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Permintaan replacement atau pembaruan akun master Anda sedang diproses oleh sistem/admin. Kredensial baru akan otomatis muncul di halaman ini setelah proses selesai.
                      </p>
                    </div>
                  </div>
                )}

                {/* Credential Box or Expired Notice */}
                {!f.isPendingReplacement && isExpired && (
                  <div className="pt-2">
                    <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Masa berlangganan telah selesai {f.expiredAt ? `pada ${formatDateJakarta(f.expiredAt)}` : ''}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Akses langganan Anda telah berakhir. Anda dapat memperpanjang atau membeli kembali produk ini untuk mendapatkan akses baru.
                      </p>
                      <div className="pt-1">
                        <a
                          href={f.productSlug ? `/products/${f.productSlug}` : '/products'}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          <span>Perpanjang / Beli Kembali</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {f.deliveryType === 'DOWNLOAD' ? (
                  <div className="pt-2">
                    <a
                      href={`/api/downloads/${f.downloadToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white transition shadow-md shadow-blue-500/20"
                    >
                      <Download className="h-4 w-4" />
                      <span>Unduh File Aset Digital</span>
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {f.isPendingReplacement
                          ? 'Kredensial Sebelumnya (Sedang Diproses Penggantian):'
                          : 'Payload / Kredensial:'}
                      </span>
                      {payloadText && payloadText !== 'No payload snapshot available' && (
                        <button
                          onClick={() => toggleReveal(f.id)}
                          className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          <span>{isRevealed ? 'Sembunyikan' : 'Tampilkan Kredensial'}</span>
                        </button>
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center justify-between font-mono text-xs text-blue-600 dark:text-cyan-300 font-bold break-all select-all">
                      {f.isPendingReplacement && (!payloadText || payloadText === 'No payload snapshot available') ? (
                        <span className="text-amber-400 font-normal text-xs">Menunggu alokasi akun master baru dari sistem...</span>
                      ) : isRevealed ? (
                        <FormattedCredentialView content={payloadText} />
                      ) : (
                        <span>••••••••••••••••••••••••••••••••</span>
                      )}
                      {isRevealed && payloadText && payloadText !== 'No payload snapshot available' && (
                        <button
                          onClick={() => handleCopy(payloadText)}
                          className="ml-2 text-slate-400 hover:text-blue-600 dark:hover:text-white p-1 shrink-0 transition"
                          title="Salin"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Product Guide (Tutorial & S&K) Action Bar */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  {!isExpired && isRevealed && extractFirstUrl(payloadText) && (
                    <a
                      href={extractFirstUrl(payloadText)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-extrabold text-[11px] transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 dark:shadow-cyan-500/20"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Buka Link Undangan / Akses</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenGuide(f.orderItemId, 'tutorial')}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-600 dark:hover:bg-slate-700 text-slate-800 dark:text-cyan-300 hover:text-white text-[11px] font-bold transition flex items-center gap-1.5 border border-slate-300 dark:border-slate-700/60 shadow-sm"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" />
                    <span>Tutorial Penggunaan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenGuide(f.orderItemId, 'terms')}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-[11px] font-bold transition flex items-center gap-1.5 border border-slate-300 dark:border-slate-700/60 shadow-sm"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Syarat &amp; Ketentuan Produk</span>
                  </button>
                </div>

                {/* VERIFICATION CODE SYSTEM CARD */}
                <VerificationCodeCard orderItemId={f.orderItemId} />

                {/* AUTO REPLACEMENT SYSTEM PROTECTION CARD */}
                <ReplacementProtectionCard orderItemId={f.orderItemId} />
              </div>
            );
          })}
        </div>
      )}

      {/* RATING & REVIEW MODAL */}
      {selectedProduct && (
        <OrderReviewModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          existingReview={reviews.find((r) => r.productId === selectedProduct.id)}
          onSuccess={handleReviewSuccess}
        />
      )}

      {/* FIRST-TIME NOTICE GUIDE ORCHESTRATOR */}
      <FirstTimeGuideOrchestrator />

      {/* ON-DEMAND PRODUCT GUIDE VIEWER MODAL */}
      <ProductGuideViewerModal
        isOpen={guideViewerOpen}
        orderItemId={selectedGuideOrderItemId}
        initialTab={selectedGuideTab}
        onClose={() => setGuideViewerOpen(false)}
      />
    </div>
  );
}
