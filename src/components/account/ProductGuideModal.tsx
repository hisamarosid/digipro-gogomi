'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  X,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { SanitizedGuideViewer } from '../common/SanitizedGuideViewer';

export interface GuideModalItem {
  orderItemId: string;
  orderNumber: string;
  productId: string;
  productName: string;
  variantName: string;
  guideVersion: number;
  requireGuideAcknowledgement: boolean;
  tutorialContent: string;
  termsContent: string;
  importantNotes?: string;
}

interface ProductGuideModalProps {
  items: GuideModalItem[];
  isOpen: boolean;
  onClose: () => void;
  onAllAcknowledged?: () => void;
}

export function ProductGuideModal({
  items,
  isOpen,
  onClose,
  onAllAcknowledged,
}: ProductGuideModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'tutorial' | 'terms'>('tutorial');
  const [isChecked, setIsChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !items || items.length === 0) return null;

  const currentItem = items[currentIndex] || items[0];
  const totalItems = items.length;
  const isMultiProduct = totalItems > 1;
  const isLastProduct = currentIndex === totalItems - 1;

  const handleNextOrFinish = async () => {
    if (currentItem.requireGuideAcknowledgement && !isChecked) {
      toast.error('Silakan centang persetujuan terlebih dahulu.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/account/products/${currentItem.orderItemId}/guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan persetujuan');
      }

      if (isLastProduct) {
        toast.success('Panduan produk berhasil disetujui!');
        setIsChecked(false);
        onClose();
        if (onAllAcknowledged) onAllAcknowledged();
      } else {
        setIsChecked(false);
        setActiveTab('tutorial');
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat memproses.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20 shrink-0">
              <ShieldCheck className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-white text-base">Produk Anda Sudah Siap! 🚀</h2>
                {isMultiProduct && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-extrabold text-[10px] border border-cyan-500/30">
                    Produk {currentIndex + 1} dari {totalItems}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="font-bold text-slate-200">{currentItem.productName}</span> &bull;{' '}
                <span className="text-cyan-400">{currentItem.variantName}</span>
              </p>
            </div>
          </div>

          {!currentItem.requireGuideAcknowledgement && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Informational Pre-notice */}
        <div className="px-6 py-2.5 bg-cyan-950/40 border-b border-cyan-500/20 flex items-center justify-between gap-3 text-[11px] text-cyan-200">
          <span>
            Sebelum mulai menggunakan produk, mohon luangkan waktu membaca tutorial dan syarat penggunaan di bawah.
          </span>
          <span className="font-mono text-[10px] text-cyan-400 shrink-0">
            Versi Guide: v{currentItem.guideVersion}
          </span>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-4 flex items-center gap-2 border-b border-slate-800/80 bg-slate-900/50">
          <button
            type="button"
            onClick={() => setActiveTab('tutorial')}
            className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'tutorial'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Tutorial Penggunaan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'terms'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Syarat &amp; Ketentuan Khusus</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900/80">
          {/* Important Notes Box if Available */}
          {currentItem.importantNotes && currentItem.importantNotes.trim() && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
              <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-amber-300 block">Catatan Penting:</span>
                <p className="leading-relaxed text-slate-300 text-[11px] whitespace-pre-line">
                  {currentItem.importantNotes}
                </p>
              </div>
            </div>
          )}

          {/* Active Tab Content */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 min-h-[180px]">
            {activeTab === 'tutorial' ? (
              <SanitizedGuideViewer
                content={currentItem.tutorialContent}
                emptyPlaceholder="Tidak ada tutorial khusus untuk produk ini. Kredensial siap digunakan langsung."
              />
            ) : (
              <SanitizedGuideViewer
                content={currentItem.termsContent}
                emptyPlaceholder="Syarat & Ketentuan standar Gogomi Store berlaku untuk produk ini."
              />
            )}
          </div>
        </div>

        {/* Footer Bar & Acknowledgment Action */}
        <div className="p-5 bg-slate-950 border-t border-slate-800 space-y-3.5">
          {/* Checkbox Acknowledgment */}
          {currentItem.requireGuideAcknowledgement ? (
            <label className="flex items-start gap-3 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/30 transition cursor-pointer"
              />
              <span className="text-xs text-slate-300 group-hover:text-white transition leading-relaxed">
                Saya telah membaca, memahami, dan menyetujui seluruh <strong className="text-cyan-300">Tutorial</strong> serta <strong className="text-cyan-300">Syarat &amp; Ketentuan</strong> penggunaan produk ini.
              </span>
            </label>
          ) : (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Anda dapat membaca kembali panduan ini kapan saja melalui menu Produk Saya.</span>
            </div>
          )}

          {/* Action Button */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-slate-500 font-mono">
              Order: {currentItem.orderNumber}
            </div>

            <button
              type="button"
              disabled={submitting || (currentItem.requireGuideAcknowledgement && !isChecked)}
              onClick={handleNextOrFinish}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-lg ${
                submitting || (currentItem.requireGuideAcknowledgement && !isChecked)
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20 font-black'
              }`}
            >
              {submitting ? (
                <span>Menyimpan...</span>
              ) : isLastProduct ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Mulai Gunakan Produk</span>
                </>
              ) : (
                <>
                  <span>Lanjut ke Panduan Berikutnya ({currentIndex + 2}/{totalItems})</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
