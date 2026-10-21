'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import { ShoppingBag, Star, QrCode, CheckCircle2, MessageSquare, ArrowRight, FileText } from 'lucide-react';
import { OrderReviewModal } from '@/components/account/OrderReviewModal';
import { Pagination } from '@/components/ui/Pagination';

interface CustomerOrdersClientProps {
  orders: any[];
  existingReviews: any[];
}

export function CustomerOrdersClient({ orders, existingReviews }: CustomerOrdersClientProps) {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState<any[]>(existingReviews);
  const [filterTab, setFilterTab] = useState<string>('ALL');

  // Review Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
  } | null>(null);

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

  const filteredOrders = orders.filter((ord) => {
    if (filterTab === 'PENDING') return ord.status === 'PENDING_PAYMENT';
    if (filterTab === 'COMPLETED') return ord.status === 'PAID' || ord.status === 'COMPLETED';
    return true;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
            <span>{t('acc_orders_title')}</span>
          </h1>
          <p className="text-xs text-slate-400">{t('acc_orders_subtitle')}</p>
        </div>

        <div className="flex gap-1.5 text-xs">
          {[
            { id: 'ALL', label: t('acc_orders_title') },
            { id: 'PENDING', label: t('acc_orders_status_pending') },
            { id: 'COMPLETED', label: t('acc_orders_status_completed') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterTab(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-[11px] ${
                filterTab === tab.id
                  ? 'bg-blue-600 text-white shadow font-extrabold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-3xl glass-panel border border-slate-800 p-12 text-center text-slate-400 text-xs">
          {t('acc_orders_empty')}
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((ord) => {
            const isPaid = ord.status === 'PAID' || ord.status === 'COMPLETED';

            return (
              <div key={ord.id} className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                
                {/* Order Header Bar */}
                <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-3">
                  <div>
                    <span className="font-bold text-white font-mono text-xs sm:text-sm">{ord.orderNumber}</span>
                    <span className="text-[10px] text-slate-400 block">{formatDateJakarta(ord.createdAt)}</span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                        isPaid
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : ord.status === 'PENDING_PAYMENT'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                          : ord.status === 'EXPIRED' || ord.status === 'FAILED'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {ord.status === 'PENDING_PAYMENT'
                        ? t('acc_orders_status_pending')
                        : ord.status === 'EXPIRED'
                        ? t('acc_orders_status_expired')
                        : ord.status === 'CANCELLED'
                        ? t('acc_orders_status_cancelled')
                        : ord.status === 'PAID' || ord.status === 'COMPLETED'
                        ? t('acc_orders_status_completed')
                        : ord.status}
                    </span>

                    {ord.status === 'PENDING_PAYMENT' && (
                      <Link
                        href={`/payment/${ord.orderNumber}`}
                        className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] px-2.5 py-1 transition flex items-center gap-1 shadow"
                      >
                        <QrCode className="h-3 w-3" />
                        <span>{t('acc_orders_pay_now')}</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Items List with Review Action */}
                <div className="space-y-3">
                  {ord.items.map((item: any) => {
                    const productId = item.variant?.productId;
                    const existingReview = reviews.find((r) => r.productId === productId);

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-white text-xs">{item.productName}</p>
                          <p className="text-[10px] text-blue-600 dark:text-cyan-400 font-medium">
                            {item.variantName} x{item.quantity}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                          <span className="font-bold text-white font-mono">{formatIDR(item.subtotal)}</span>

                          {/* RATING & REVIEW BUTTON FOR PAID ORDERS */}
                          {isPaid && productId && (
                            <div>
                              {existingReview ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReview(productId, item.productName)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 text-[11px] font-bold transition"
                                  title="Edit Ulasan Produk"
                                >
                                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                  <span>{existingReview.rating}/5 (Edit Ulasan)</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReview(productId, item.productName)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black shadow transition"
                                >
                                  <Star className="h-3.5 w-3.5 fill-slate-950 text-slate-950" />
                                  <span>+ Beri Rating & Ulasan</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Totals & Action CTAs */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-slate-800/80 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-medium">Total Pembayaran:</span>
                    <span className="block text-sm font-extrabold text-blue-600 dark:text-cyan-400 font-mono">
                      {formatIDR(ord.grandTotal)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Link
                      href={`/invoice/${ord.orderNumber}`}
                      target="_blank"
                      className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:text-white transition shadow-sm"
                      title="Lihat & Download Faktur Pembayaran PDF"
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-400" />
                      <span>Invoice PDF</span>
                    </Link>

                    {ord.status === 'PENDING_PAYMENT' && (
                      <Link
                        href={`/payment/${ord.orderNumber}`}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-xs font-black text-white transition shadow-md shadow-blue-500/20"
                      >
                        <QrCode className="h-4 w-4" />
                        <span>Bayar QRIS</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>

              </div>
            );
          })}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredOrders.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
          />
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

    </div>
  );
}
