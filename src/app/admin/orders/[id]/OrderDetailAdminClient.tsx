'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import {
  ShoppingBag,
  User,
  CreditCard,
  Package,
  Key,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { CredentialFieldsView } from '@/components/common/FormattedCredentialView';

interface OrderDetailAdminClientProps {
  order: any;
}

export function OrderDetailAdminClient({ order: initialOrder }: OrderDetailAdminClientProps) {
  const [order, setOrder] = useState(initialOrder);
  const [showPayloads, setShowPayloads] = useState<Record<string, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [selectedItemForManual, setSelectedItemForManual] = useState<any | null>(null);
  const [manualPayloadText, setManualPayloadText] = useState('');

  const handleOpenManualModal = (item: any) => {
    setSelectedItemForManual(item);
    const existingFulfillment = item.fulfillments?.[0];
    setManualPayloadText(existingFulfillment?.payloadRevealed || existingFulfillment?.payloadDecrypted || '');
    setManualModalOpen(true);
  };

  const handleSaveManualFulfillment = async () => {
    if (!selectedItemForManual || !manualPayloadText.trim()) {
      toast.error('Payload / Kredensial tidak boleh kosong.');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/manual-fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItemId: selectedItemForManual.id,
          customPayload: manualPayloadText.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Fulfillment manual berhasil disimpan!');
        setManualModalOpen(false);
        if (json.data) {
          setOrder(json.data);
        } else {
          window.location.reload();
        }
      } else {
        toast.error(json.error || 'Gagal menyimpan fulfillment manual');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePayload = (id: string) => {
    setShowPayloads((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} berhasil disalin ke clipboard`);
  };

  const handleRetryFulfillment = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/retry-fulfillment`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Fulfillment berhasil diproses ulang!');
        window.location.reload();
      } else {
        toast.error(json.error || 'Gagal memproses ulang fulfillment');
      }
    } catch {
      toast.error('Gagal memproses ulang fulfillment');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'PAID':
        return (
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> {status}
          </span>
        );
      case 'NEEDS_FULFILLMENT':
      case 'WAITING_STOCK':
        return (
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1 animate-pulse">
            <AlertTriangle className="h-3.5 w-3.5" /> {status}
          </span>
        );
      case 'CANCELLED':
      case 'FAILED':
        return (
          <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" /> {status}
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {status}
          </span>
        );
    }
  };

  const customerName = order.user?.name || order.guestName || 'Guest Customer';
  const customerEmail = order.user?.email || order.guestEmail || 'N/A';

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Back Button & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Daftar Pesanan</span>
          </Link>

          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <ShoppingBag className="h-7 w-7 text-cyan-400" />
            <span>Detail Pesanan #{order.orderNumber}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dibuat pada: <span className="text-white font-medium">{formatDateJakarta(order.createdAt)}</span> &bull; ID System: <span className="font-mono text-cyan-300">{order.id}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {getStatusBadge(order.status)}

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleRetryFulfillment}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 disabled:opacity-50 shadow-lg"
          >
            <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>Proses Ulang Fulfillment</span>
          </button>
        </div>
      </div>

      {/* Grid Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Info Card */}
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-teal-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Informasi Pelanggan</h2>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <p className="text-slate-400">Nama Customer</p>
              <p className="font-bold text-white text-sm">{customerName}</p>
            </div>

            <div>
              <p className="text-slate-400">Email Customer</p>
              <p className="font-bold text-cyan-300 text-sm font-mono">{customerEmail}</p>
            </div>

            <div>
              <p className="text-slate-400">Tipe Akun</p>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                {order.user ? `REGISTERED (${order.user.role})` : 'GUEST CHECKOUT'}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Summary Card */}
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-violet-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Ringkasan Pembayaran</h2>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Pembayaran:</span>
              <span className="font-mono font-extrabold text-cyan-300 text-base">{formatIDR(order.grandTotal)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Status Pembayaran:</span>
              <span className="font-bold text-white">{order.paymentStatus}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Metode Pembayaran:</span>
              <span className="font-bold text-slate-200">QRIS (AutoGoPay)</span>
            </div>
          </div>
        </div>

        {/* Fulfillment Status Card */}
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Status Akses Digital</h2>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <p className="text-slate-400">Total Item Produk</p>
              <p className="font-bold text-white text-sm">{order.items.length} Produk Digital</p>
            </div>

            <div>
              <p className="text-slate-400">Garansi & Replacement</p>
              <p className="font-bold text-emerald-400">
                {order.replacementRequests?.length || 0} Klaim Terdaftar
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Items & Credentials List */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-6 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Key className="h-5 w-5 text-cyan-400" />
          <span>Daftar Produk & Kredensial Akses Lisensi</span>
        </h2>

        <div className="space-y-4">
          {order.items.map((item: any) => (
            <div key={item.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3 text-xs">
                <div>
                  <h3 className="font-extrabold text-sm text-white">{item.variant?.product?.name || item.productName || 'Produk Digital'}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Varian: <span className="text-cyan-300 font-bold">{item.variantName || 'Standard'}</span> &bull; Qty: <span className="text-white font-bold">{item.quantity}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenManualModal(item)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow"
                  >
                    <Key className="h-3.5 w-3.5" />
                    <span>Input / Edit Kredensial Manual</span>
                  </button>
                  <span className="font-mono font-bold text-cyan-300 text-sm">{formatIDR((item.unitPrice || item.price || 0) * item.quantity)}</span>
                </div>
              </div>

              {/* Fulfillments Array */}
              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Fulfillment Credentials ({item.fulfillments?.length || 0}):
                </p>

                {!item.fulfillments || item.fulfillments.length === 0 ? (
                  <p className="text-slate-500 italic">Belum ada kredensial yang dialokasikan.</p>
                ) : (
                  item.fulfillments.map((ful: any) => (
                    <div key={ful.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                          {ful.deliveryType}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Status: <strong className="text-white">{ful.status}</strong>
                        </span>
                      </div>

                      {/* Payload Reveal Box */}
                      {(ful.payloadRevealed || ful.payloadDecrypted) ? (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-bold">Payload / Kredensial:</span>
                            <button
                              type="button"
                              onClick={() => togglePayload(ful.id)}
                              className="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
                            >
                              {showPayloads[ful.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              <span>{showPayloads[ful.id] ? 'Sembunyikan' : 'Tampilkan Kredensial'}</span>
                            </button>
                          </div>

                          {showPayloads[ful.id] && (
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-xs flex items-start justify-between gap-3 whitespace-pre-wrap break-all">
                              <CredentialFieldsView content={ful.payloadRevealed || ful.payloadDecrypted} />
                              <button
                                type="button"
                                onClick={() => copyToClipboard(ful.payloadRevealed || ful.payloadDecrypted, 'Kredensial')}
                                className="p-1 rounded text-slate-400 hover:text-white shrink-0"
                                title="Salin semua"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Payload aman terenkripsi (AES-256-GCM).</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MANUAL FULFILLMENT MODAL */}
      {manualModalOpen && selectedItemForManual && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Key className="h-4 w-4 text-cyan-400" />
                <span>Input Kredensial Manual</span>
              </h3>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-300">
                Produk: <strong className="text-white">{selectedItemForManual.productName || selectedItemForManual.variant?.product?.name}</strong>
              </p>
              <p className="text-slate-400">
                Varian: <span className="text-cyan-300 font-bold">{selectedItemForManual.variantName}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Payload / Teks Kredensial (Email, Password, License Key, Link Access):</label>
              <textarea
                rows={5}
                value={manualPayloadText}
                onChange={(e) => setManualPayloadText(e.target.value)}
                placeholder="Contoh: Email: user@example.com | Pass: secret123 | Key: XXXX-YYYY-ZZZZ"
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSaveManualFulfillment}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg disabled:opacity-50"
              >
                {isProcessing ? 'Menyimpan...' : 'Simpan & Kirim ke Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
