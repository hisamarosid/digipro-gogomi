'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import {
  ShieldAlert,
  ArrowLeft,
  Copy,
  ExternalLink,
  MessageSquare,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Plus,
  FileText,
  DollarSign,
  PackageCheck,
  UserCheck,
  PhoneCall,
} from 'lucide-react';
import { toast } from 'sonner';

export function SingleSupplierClaimAdminClient({ claimId }: { claimId: string }) {
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Credential Reveal State
  const [revealedData, setRevealedData] = useState<any>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealReason, setRevealReason] = useState('Supplier Warranty Verification');
  const [showRevealModal, setShowRevealModal] = useState(false);

  // Claim Message Generator State
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  // Action Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitChannel, setSubmitChannel] = useState('WHATSAPP');
  const [submitRef, setSubmitRef] = useState('');

  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseType, setResponseType] = useState('APPROVED_REPLACEMENT');
  const [responseSummary, setResponseSummary] = useState('');

  const [showResolveReplacementModal, setShowResolveReplacementModal] = useState(false);
  const [newCredential, setNewCredential] = useState('');

  const [showResolveRefundModal, setShowResolveRefundModal] = useState(false);
  const [refundType, setRefundType] = useState('FULL_REFUND');
  const [refundAmount, setRefundAmount] = useState(0);

  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchClaimDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/suppliers/claims/${claimId}`);
      const json = await res.json();
      if (json.success) {
        setClaim(json.data);
        setRefundAmount(json.data.claimValue || 0);
      } else {
        toast.error('Gagal memuat detail klaim');
      }
    } catch {
      toast.error('Gagal memuat detail klaim');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaimDetail();
  }, [claimId]);

  const handleGenerateMessage = async () => {
    setIsGeneratingMessage(true);
    try {
      const res = await fetch(`/api/admin/suppliers/claims/${claimId}/generate-message`);
      const json = await res.json();
      if (json.success) {
        setGeneratedMessage(json.data.claimMessage);
        toast.success('Pesan klaim berhasil digenerasi!');
      }
    } catch {
      toast.error('Gagal menggenerasi pesan klaim');
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleRevealCredential = async () => {
    setIsRevealing(true);
    try {
      const res = await fetch(`/api/admin/suppliers/claims/${claimId}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryId: claim.assetId,
          reason: revealReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRevealedData(json.data);
        setShowRevealModal(false);
        toast.success('Kredensial berhasil didekripsi & dicatat di Audit Log!');
      } else {
        toast.error(`Gagal dekripsi: ${json.error}`);
      }
    } catch {
      toast.error('Gagal melakukan dekripsi kredensial');
    } finally {
      setIsRevealing(false);
    }
  };

  const handleMarkSubmitted = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/suppliers/claims/${claimId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: submitChannel,
          externalReference: submitRef,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Status klaim berhasil diperbarui menjadi WAITING_SUPPLIER!');
        setShowSubmitModal(false);
        fetchClaimDetail();
      } else {
        toast.error(`Gagal: ${json.error}`);
      }
    } catch {
      toast.error('Gagal memperbarui status');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRecordResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseSummary.trim()) {
      toast.error('Ringkasan respon wajib diisi');
      return;
    }
    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/suppliers/claims/${claimId}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseType,
          messageSummary: responseSummary,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Respon supplier berhasil dicatat!');
        setShowResponseModal(false);
        fetchClaimDetail();
      } else {
        toast.error(`Gagal: ${json.error}`);
      }
    } catch {
      toast.error('Gagal mencatat respon supplier');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleResolveReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCredential.trim()) {
      toast.error('Kredensial baru wajib diisi');
      return;
    }
    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/suppliers/claims/${claimId}/resolve-replacement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newCredentialPayload: newCredential.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Penggantian stok lisensi dari supplier berhasil diterima! (Modal Rp0)');
        setShowResolveReplacementModal(false);
        fetchClaimDetail();
      } else {
        toast.error(`Gagal: ${json.error}`);
      }
    } catch {
      toast.error('Gagal menyelesaikan penggantian stok');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleResolveRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/suppliers/claims/${claimId}/resolve-refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: refundType,
          amount: refundAmount,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Recovery pengembalian dana/kredit berhasil dicatat! Klaim SELESAI.');
        setShowResolveRefundModal(false);
        fetchClaimDetail();
      } else {
        toast.error(`Gagal: ${json.error}`);
      }
    } catch {
      toast.error('Gagal mencatat pengembalian dana');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} berhasil disalin ke clipboard!`);
  };

  if (loading || !claim) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="animate-spin h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="font-medium text-sm">Memuat Workspace Klaim Garansi Supplier...</p>
      </div>
    );
  }

  const supplierPhone = claim.supplier?.phone || claim.supplier?.whatsapp;
  const whatsappUrl = supplierPhone
    ? `https://wa.me/${supplierPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(generatedMessage || 'Halo Kak, mau tanya klaim garansi.')}`
    : null;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <Link
            href="/admin/suppliers/claims"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Daftar Klaim Supplier</span>
          </Link>

          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <ShieldAlert className="h-7 w-7 text-cyan-400" />
            <span>Workspace Klaim #{claim.claimNumber}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Supplier: <strong className="text-white">{claim.supplier?.name || claim.supplierNameSnapshot}</strong> &bull; Dibuat pada: <span className="text-white font-medium">{formatDateJakarta(claim.createdAt)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {claim.status === 'READY_TO_CLAIM' || claim.status === 'DRAFT' ? (
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Tandai Sudah Diajukan Ke Supplier</span>
            </button>
          ) : null}

          {claim.status === 'WAITING_SUPPLIER' || claim.status === 'SUBMITTED' ? (
            <>
              <button
                type="button"
                onClick={() => setShowResponseModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Catat Respon Supplier</span>
              </button>

              <button
                type="button"
                onClick={() => setShowResolveReplacementModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg"
              >
                <PackageCheck className="h-4 w-4" />
                <span>Terima Replacement Lisensi</span>
              </button>

              <button
                type="button"
                onClick={() => setShowResolveRefundModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg"
              >
                <DollarSign className="h-4 w-4" />
                <span>Konfirmasi Refund / Credit</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Grid Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Claim Summary Card */}
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-3">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status Klaim Saat Ini</p>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold text-xs">
              {claim.status}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-xs space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Potensi Nilai Klaim:</span>
              <span className="font-mono font-bold text-cyan-300">{formatIDR(claim.claimValue)}</span>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>Batas Akhir Garansi:</span>
              <span className="font-medium text-white">{claim.claimDeadlineAt ? formatDateJakarta(claim.claimDeadlineAt) : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* External Supplier Contact Card */}
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-3">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kontak Supplier External</p>
          <p className="font-bold text-white text-sm">{claim.supplier?.name || claim.supplierNameSnapshot}</p>

          <div className="text-xs space-y-1 text-slate-300">
            <p>Metode Utama: <strong className="text-cyan-300">{claim.supplier?.primaryContactMethod || 'WHATSAPP'}</strong></p>
            <p>No. Telp/WA: <strong className="text-white">{supplierPhone || 'Tidak ada nomor'}</strong></p>
          </div>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition inline-flex items-center justify-center gap-2 shadow-md"
            >
              <PhoneCall className="h-4 w-4" />
              <span>Buka Chat WhatsApp Supplier</span>
            </a>
          )}
        </div>

        {/* Decoupling Customer Information Card */}
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-3">
          <p className="text-[10px] text-teal-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <UserCheck className="h-4 w-4" />
            <span>Dekapling Customer (Bebas Menunggu)</span>
          </p>
          <p className="text-xs text-slate-300">
            Customer replacement <strong className="text-emerald-400">TIDAK BERGANTUNG</strong> pada klaim garansi supplier ini.
          </p>
          {claim.replacementLink ? (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
              <p>Replacement Customer: <span className="font-mono text-cyan-300 font-bold">#{claim.replacementLink.requestNumber}</span></p>
              <p>Customer: <strong className="text-white">{claim.replacementLink.user?.name || 'Customer'}</strong></p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Claim Message Generator */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-cyan-400" />
            <span>Generasi Pesan Klaim Garansi External</span>
          </h2>

          <button
            type="button"
            disabled={isGeneratingMessage}
            onClick={handleGenerateMessage}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isGeneratingMessage ? 'animate-spin' : ''}`} />
            <span>Generasi Teks Pesan Klaim</span>
          </button>
        </div>

        {generatedMessage ? (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap">
              {generatedMessage}
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(generatedMessage, 'Pesan Klaim Garansi')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition inline-flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              <span>Salin Pesan Klaim Lengkap</span>
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Klik tombol "Generasi Teks Pesan Klaim" di atas untuk membuat pesan klaim terformat tanpa membocorkan password customer.
          </p>
        )}
      </div>

      {/* Secure Broken Credential Reveal Panel */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Eye className="h-5 w-5 text-amber-400" />
          <span>Dekripsi Aman Kredensial Stok Lama (Internal Audit Only)</span>
        </h2>

        <p className="text-xs text-slate-400">
          Kredensial lama tersimpan aman terenkripsi (AES-256-GCM). Dekripsi hanya dapat dilakukan oleh Admin berwenang dan setiap akses dicatat ke dalam Audit Log.
        </p>

        {revealedData ? (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-emerald-300">
              <span className="font-bold">DECRYPTED PAYLOAD:</span>
              <button
                type="button"
                onClick={() => setRevealedData(null)}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                [ Sembunyikan ]
              </button>
            </div>
            <p className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-white break-all">
              {revealedData.decryptedPayload}
            </p>
            <button
              type="button"
              onClick={() => copyToClipboard(revealedData.decryptedPayload, 'Payload Kredensial')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-white hover:bg-slate-700 font-bold text-xs transition inline-flex items-center gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Salin Payload Kredensial</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowRevealModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition inline-flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            <span>Dekripsi Kredensial Lisensi Rusak (Reveal)</span>
          </button>
        )}
      </div>

      {/* Reveal Modal */}
      {showRevealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Konfirmasi Dekripsi Kredensial</h3>
            <p className="text-xs text-slate-400">
              Setiap kali Admin melakukan dekripsi kredensial, sistem akan mencatat ID Admin, Waktu, IP Address, dan Alasan Akses ke dalam Audit Log.
            </p>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Alasan Akses Audit:</label>
              <input
                type="text"
                value={revealReason}
                onChange={(e) => setRevealReason(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowRevealModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isRevealing}
                onClick={handleRevealCredential}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-2"
              >
                {isRevealing ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                <span>Ya, Dekripsi Kredensial</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <form onSubmit={handleMarkSubmitted} className="w-full max-w-md rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Tandai Klaim Sudah Diajukan</h3>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Saluran Pengajuan External:</label>
              <select
                value={submitChannel}
                onChange={(e) => setSubmitChannel(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="TELEGRAM">Telegram</option>
                <option value="EMAIL">Email</option>
                <option value="DISCORD">Discord</option>
                <option value="WEBSITE">Website Supplier</option>
                <option value="MARKETPLACE_CHAT">Marketplace Chat</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Nomor Referensi/Tiket Supplier (Opsional):</label>
              <input
                type="text"
                value={submitRef}
                onChange={(e) => setSubmitRef(e.target.value)}
                placeholder="Contoh: Tiket #8821 / Chat Ref 221"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold flex items-center gap-2"
              >
                {isSubmittingAction ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                <span>Simpan Pengajuan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <form onSubmit={handleRecordResponse} className="w-full max-w-md rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Catat Respon Balasan Supplier</h3>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Tipe Respon Supplier:</label>
              <select
                value={responseType}
                onChange={(e) => setResponseType(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none"
              >
                <option value="APPROVED_REPLACEMENT">Setuju Penggantian Stok Lisensi</option>
                <option value="APPROVED_FULL_REFUND">Setuju Pengembalian Dana Penuh (Full Refund)</option>
                <option value="APPROVED_PARTIAL_REFUND">Setuju Pengembalian Dana Sebagian (Partial Refund)</option>
                <option value="APPROVED_CREDIT">Setuju Deposit/Kredit Supplier</option>
                <option value="REQUESTED_MORE_INFORMATION">Supplier Minta Bukti/Info Tambahan</option>
                <option value="REJECTED">Ditolak Oleh Supplier</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Ringkasan Respon Supplier:</label>
              <textarea
                value={responseSummary}
                onChange={(e) => setResponseSummary(e.target.value)}
                placeholder="Masukkan ringkasan pesan dari supplier..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none h-24"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowResponseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-2"
              >
                {isSubmittingAction ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                <span>Simpan Respon</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resolve Replacement Modal */}
      {showResolveReplacementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <form onSubmit={handleResolveReplacement} className="w-full max-w-md rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Terima Stok Replacement Supplier (Modal Rp0)</h3>
            <p className="text-xs text-slate-400">
              Stok baru dari supplier akan otomatis tersimpan sebagai inventory baru berkategori <strong className="text-cyan-300 font-mono">SUPPLIER_WARRANTY_REPLACEMENT</strong> dengan harga modal tunai Rp0.
            </p>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Kredensial Lisensi Baru Dari Supplier:</label>
              <textarea
                value={newCredential}
                onChange={(e) => setNewCredential(e.target.value)}
                placeholder="Masukkan email:password / serial key baru dari supplier..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none h-24 font-mono"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowResolveReplacementModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold flex items-center gap-2"
              >
                {isSubmittingAction ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                <span>Terima & Simpan Stok Baru</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resolve Refund Modal */}
      {showResolveRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <form onSubmit={handleResolveRefund} className="w-full max-w-md rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Konfirmasi Refund / Credit Supplier</h3>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Bentuk Recovery:</label>
              <select
                value={refundType}
                onChange={(e) => setRefundType(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none"
              >
                <option value="FULL_REFUND">Pengembalian Dana Penuh (Full Refund)</option>
                <option value="PARTIAL_REFUND">Pengembalian Dana Sebagian (Partial Refund)</option>
                <option value="SUPPLIER_CREDIT">Kredit Deposit Supplier</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Nominal Recovery (Rp):</label>
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowResolveRefundModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-xl bg-blue-500 text-slate-950 text-xs font-bold flex items-center gap-2"
              >
                {isSubmittingAction ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                <span>Selesaikan Klaim</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
