'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  X,
  Lightbulb,
  ShieldCheck,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { SanitizedGuideViewer } from '../common/SanitizedGuideViewer';
import { formatDateJakarta } from '@/lib/utils/formatters';

interface ProductGuideViewerModalProps {
  orderItemId: string;
  initialTab?: 'tutorial' | 'terms';
  isOpen: boolean;
  onClose: () => void;
}

export function ProductGuideViewerModal({
  orderItemId,
  initialTab = 'tutorial',
  isOpen,
  onClose,
}: ProductGuideViewerModalProps) {
  const [activeTab, setActiveTab] = useState<'tutorial' | 'terms'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [guideData, setGuideData] = useState<any>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen || !orderItemId) return;

    let isMounted = true;
    const fetchGuide = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/account/products/${orderItemId}/guide`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        const json = await res.json();
        if (isMounted && res.ok && json.success) {
          setGuideData(json.data);
        }
      } catch {
        // Handle error gracefully
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGuide();

    return () => {
      isMounted = false;
    };
  }, [isOpen, orderItemId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <span>Panduan &amp; Ketentuan Produk</span>
                {guideData?.guideVersion && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                    v{guideData.guideVersion}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="font-bold text-slate-200">{guideData?.productName || 'Produk'}</span> &bull;{' '}
                <span className="text-cyan-400">{guideData?.variantName || 'Aset Digital'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-800/80 bg-slate-900/50">
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900/80">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-cyan-400" />
              <span>Memuat panduan produk...</span>
            </div>
          ) : (
            <>
              {/* Important Notes Box if Available */}
              {guideData?.importantNotes && guideData.importantNotes.trim() && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
                  <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-amber-300 block">Catatan Penting:</span>
                    <p className="leading-relaxed text-slate-300 text-[11px] whitespace-pre-line">
                      {guideData.importantNotes}
                    </p>
                  </div>
                </div>
              )}

              {/* Content Panel */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 min-h-[200px]">
                {activeTab === 'tutorial' ? (
                  <SanitizedGuideViewer
                    content={guideData?.tutorialContent}
                    emptyPlaceholder="Tidak ada tutorial khusus untuk produk ini. Kredensial siap digunakan langsung."
                  />
                ) : (
                  <SanitizedGuideViewer
                    content={guideData?.termsContent}
                    emptyPlaceholder="Syarat & Ketentuan standar Gogomi Store berlaku untuk produk ini."
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            {guideData?.acknowledgedAt ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Telah Disetujui: {formatDateJakarta(guideData.acknowledgedAt)}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span>Panduan Terbuka (Bebas Akses Kapan Saja)</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
