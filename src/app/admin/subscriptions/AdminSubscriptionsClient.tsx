'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatDateJakarta, formatIDR } from '@/lib/utils/formatters';
import {
  RefreshCw,
  Search,
  Calendar,
  User,
  Package,
  ShoppingBag,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  Clock,
  PlusCircle,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  Key,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminSubscriptionsClientProps {
  subscriptions: any[];
}

export function AdminSubscriptionsClient({ subscriptions: initialSubscriptions }: AdminSubscriptionsClientProps) {
  const [subscriptions, setSubscriptions] = useState<any[]>(initialSubscriptions);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [showPayload, setShowPayload] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const now = new Date();

  // Metrics calculation
  const totalCount = subscriptions.length;
  const activeCount = subscriptions.filter((s) => s.status === 'ACTIVE' && new Date(s.expiresAt) > now).length;
  const expiringSoonCount = subscriptions.filter((s) => {
    if (s.status !== 'ACTIVE') return false;
    const diffDays = (new Date(s.expiresAt).getTime() - now.getTime()) / (1000 * 3600 * 24);
    return diffDays > 0 && diffDays <= 7;
  }).length;
  const expiredCount = subscriptions.filter((s) => new Date(s.expiresAt) <= now || s.status === 'EXPIRED').length;

  const filteredSubscriptions = subscriptions.filter((s) => {
    const orderNumber = s.orderItem?.order?.orderNumber || '';
    const matchesSearch =
      (s.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.variant?.product?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.variant?.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      orderNumber.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const isExp = new Date(s.expiresAt) <= now;
    const diffDays = (new Date(s.expiresAt).getTime() - now.getTime()) / (1000 * 3600 * 24);

    switch (statusFilter) {
      case 'ACTIVE':
        return s.status === 'ACTIVE' && !isExp;
      case 'EXPIRING_SOON':
        return s.status === 'ACTIVE' && diffDays > 0 && diffDays <= 7;
      case 'EXPIRED':
        return isExp || s.status === 'EXPIRED';
      case 'CANCELLED':
        return s.status === 'CANCELLED';
      default:
        return true;
    }
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Kredensial berhasil disalin!');
  };

  const handleExtendSubscription = async (subId: string, extendDays: number) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${subId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extendDays }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Berhasil memperpanjang langganan +${extendDays} hari!`);

        // Update local state
        setSubscriptions((prev) =>
          prev.map((item) =>
            item.id === subId
              ? {
                ...item,
                expiresAt: json.data.expiresAt,
                renewalCount: json.data.renewalCount,
                status: json.data.status,
              }
              : item
          )
        );

        if (selectedSub?.id === subId) {
          setSelectedSub((prev: any) => ({
            ...prev,
            expiresAt: json.data.expiresAt,
            renewalCount: json.data.renewalCount,
            status: json.data.status,
          }));
        }
      } else {
        toast.error(json.error || 'Gagal memperpanjang langganan');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (subId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${subId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Status langganan diubah menjadi ${newStatus}!`);

        setSubscriptions((prev) =>
          prev.map((item) => (item.id === subId ? { ...item, status: newStatus } : item))
        );

        if (selectedSub?.id === subId) {
          setSelectedSub((prev: any) => ({ ...prev, status: newStatus }));
        }
      } else {
        toast.error(json.error || 'Gagal memperbarui status');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Subscription Management &amp; Expiry</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Langganan Digital
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Kelola durasi langganan aktif, nomor pesanan terhubung, perpanjangan manual, dan snapshot kredensial pengguna.
            </p>
          </div>
        </div>
      </div>

      {/* METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Langganan</p>
          <p className="text-2xl font-black text-white">{totalCount}</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Langganan Aktif</p>
          <p className="text-2xl font-black text-emerald-300">{activeCount}</p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Hampir Kadaluarsa (&lt; 7h)</p>
          <p className="text-2xl font-black text-amber-300">{expiringSoonCount}</p>
        </div>

        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Expired</p>
          <p className="text-2xl font-black text-rose-300">{expiredCount}</p>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari No. Order (#ORD-...), email, atau produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { id: 'ALL', label: 'Semua' },
            { id: 'ACTIVE', label: `Aktif (${activeCount})` },
            { id: 'EXPIRING_SOON', label: `Hampir Expired (${expiringSoonCount})` },
            { id: 'EXPIRED', label: `Expired (${expiredCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-[11px] ${statusFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow font-extrabold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE DATA */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6">
        {filteredSubscriptions.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">Belum ada data langganan yang cocok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-3">No. Order</th>
                  <th className="py-3 px-3">Pelanggan</th>
                  <th className="py-3 px-3">Produk & Varian SKU</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Aktivasi</th>
                  <th className="py-3 px-3">Kadaluarsa (Sisa Waktu)</th>
                  <th className="py-3 px-3 text-center">Perpanjang</th>
                  <th className="py-3 px-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(() => {
                  const totalPages = Math.ceil(filteredSubscriptions.length / pageSize) || 1;
                  const paginatedSubscriptions = filteredSubscriptions.slice(
                    (currentPage - 1) * pageSize,
                    currentPage * pageSize
                  );

                  return paginatedSubscriptions.map((sub) => {
                    const orderNumber = sub.orderItem?.order?.orderNumber;
                    const isExp = new Date(sub.expiresAt) <= now;
                    const daysLeft = Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - now.getTime()) / (1000 * 3600 * 24)));

                    return (
                      <tr key={sub.id} className="hover:bg-slate-900/40 transition">

                        {/* No Order Column */}
                        <td className="py-3 px-3">
                          {orderNumber ? (
                            <Link
                              href={`/admin/orders?search=${orderNumber}`}
                              className="font-mono font-bold text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                            >
                              <ShoppingBag className="h-3 w-3 text-cyan-400" />
                              <span>{orderNumber}</span>
                            </Link>
                          ) : (
                            <span className="text-slate-600 font-mono text-[11px]">-</span>
                          )}
                        </td>

                        {/* Customer Column */}
                        <td className="py-3 px-3">
                          <p className="font-bold text-white line-clamp-1">{sub.user?.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{sub.user?.email}</p>
                        </td>

                        {/* Product & Variant SKU Column */}
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-200 line-clamp-1">{sub.variant?.product?.name}</p>
                          <p className="text-[10px] text-cyan-400 font-mono">{sub.variant?.name} ({sub.variant?.sku})</p>
                        </td>

                        {/* Status Column */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase border ${sub.status === 'ACTIVE' && !isExp
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}
                          >
                            {isExp ? 'EXPIRED' : sub.status}
                          </span>
                        </td>

                        {/* Activation Date */}
                        <td className="py-3 px-3 text-[11px] text-slate-400">
                          {formatDateJakarta(sub.activatedAt)}
                        </td>

                        {/* Expiration Date & Remaining Days */}
                        <td className="py-3 px-3 text-[11px]">
                          <p className={`font-bold ${isExp ? 'text-rose-400' : daysLeft <= 7 ? 'text-amber-400 font-black' : 'text-emerald-400'}`}>
                            {formatDateJakarta(sub.expiresAt)}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {isExp ? '(Kedaluwarsa)' : `${daysLeft} Hari Lagi`}
                          </span>
                        </td>

                        {/* Renewal Count */}
                        <td className="py-3 px-3 font-mono text-center font-bold text-white">
                          {sub.renewalCount}x
                        </td>

                        {/* Action Detail Button */}
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedSub(sub);
                              setShowPayload(false);
                            }}
                            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-[11px] font-bold border border-slate-700 transition"
                          >
                            Detail & Edit
                          </button>
                        </td>

                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {filteredSubscriptions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span>Menampilkan</span>
              <span className="font-bold font-mono text-white">
                {Math.min((currentPage - 1) * pageSize + 1, filteredSubscriptions.length)}
              </span>
              <span>-</span>
              <span className="font-bold font-mono text-white">
                {Math.min(currentPage * pageSize, filteredSubscriptions.length)}
              </span>
              <span>dari</span>
              <span className="font-bold font-mono text-cyan-400">
                {filteredSubscriptions.length}
              </span>
              <span>langganan</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-xs px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
              >
                <option value={10}>10 / hal</option>
                <option value={15}>15 / hal</option>
                <option value={25}>25 / hal</option>
                <option value={50}>50 / hal</option>
              </select>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 font-bold transition"
                >
                  Sebelumnya
                </button>
                <span className="px-3 py-1.5 font-mono font-extrabold text-cyan-300 bg-slate-900 border border-slate-800 rounded-xl">
                  {currentPage} / {Math.ceil(filteredSubscriptions.length / pageSize) || 1}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= (Math.ceil(filteredSubscriptions.length / pageSize) || 1)}
                  onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredSubscriptions.length / pageSize) || 1, p + 1))}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 font-bold transition"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RICH SUBSCRIPTION DETAIL MODAL */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white">Detail Langganan Aktif & No. Order</h3>
                  <p className="text-[11px] text-slate-400">ID Sub: <span className="font-mono">{selectedSub.id}</span></p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Section 1: Connected Order Details (No. Order) */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2">
              <span className="text-[10px] text-cyan-400 uppercase font-extrabold tracking-wider block">
                INFORMATION PESANAN TERHUBUNG (NO. ORDER)
              </span>

              {selectedSub.orderItem?.order ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nomor Pesanan (Order No):</span>
                    <Link
                      href={`/admin/orders?search=${selectedSub.orderItem.order.orderNumber}`}
                      target="_blank"
                      className="font-mono font-black text-cyan-400 hover:underline flex items-center gap-1 text-sm mt-0.5"
                    >
                      <ShoppingBag className="h-4 w-4 text-cyan-400" />
                      <span>{selectedSub.orderItem.order.orderNumber}</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Tanggal Checkout:</span>
                    <span className="font-bold text-white mt-0.5 block">
                      {formatDateJakarta(selectedSub.orderItem.order.createdAt)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Status Pesanan:</span>
                    <span className="inline-block mt-0.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {selectedSub.orderItem.order.status}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Pesanan dibuat manual / Tanpa terikat nomor order.</p>
              )}
            </div>

            {/* Section 2: Customer & Product Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold block flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-blue-400" /> Pelanggan (Customer)
                </span>
                <p className="font-bold text-white text-sm">{selectedSub.user?.name}</p>
                <p className="font-mono text-cyan-400 text-xs">{selectedSub.user?.email}</p>
                <p className="text-[10px] text-slate-500 font-mono">User ID: {selectedSub.userId}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-extrabold block flex items-center gap-1">
                  <Package className="h-3.5 w-3.5 text-emerald-400" /> Produk & Varian Digital
                </span>
                <p className="font-bold text-white text-sm">{selectedSub.variant?.product?.name}</p>
                <p className="font-mono text-cyan-400 text-xs">{selectedSub.variant?.name} ({selectedSub.variant?.sku})</p>
                <p className="text-[10px] text-slate-400">
                  Durasi Variant: {selectedSub.variant?.subscriptionDays || 30} Hari | Garansi: {selectedSub.variant?.warrantyDays || 30} Hari
                </p>
              </div>
            </div>

            {/* Section 3: Credentials Snapshot Delivered to Customer */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-400 uppercase font-extrabold flex items-center gap-1">
                  <Key className="h-3.5 w-3.5 text-amber-400" /> Snapshot Kredensial / Payload Terkirim
                </span>
                <div className="flex items-center gap-2">
                  {selectedSub.orderItem?.order?.id && (
                    <Link
                      href={`/admin/orders/${selectedSub.orderItem.order.id}`}
                      target="_blank"
                      className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20"
                    >
                      <Key className="h-3 w-3" />
                      <span>Edit Kredensial Order</span>
                    </Link>
                  )}
                  {selectedSub.orderItem?.fulfillments?.[0]?.payloadRevealed && (
                    <button
                      onClick={() => setShowPayload(!showPayload)}
                      className="text-xs text-cyan-400 font-bold hover:underline flex items-center gap-1"
                    >
                      {showPayload ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      <span>{showPayload ? 'Sembunyikan' : 'Tampilkan Kredensial'}</span>
                    </button>
                  )}
                </div>
              </div>

              {selectedSub.orderItem?.fulfillments?.[0]?.payloadRevealed ? (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-xs text-emerald-300 break-all select-all flex items-center justify-between">
                  <span>{showPayload ? selectedSub.orderItem.fulfillments[0].payloadRevealed : '••••••••••••••••••••••••••••••••'}</span>
                  {showPayload && (
                    <button
                      onClick={() => handleCopy(selectedSub.orderItem.fulfillments[0].payloadRevealed)}
                      className="ml-2 text-slate-400 hover:text-white p-1"
                      title="Salin Kredensial"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Belum ada kredensial yang terdaftar untuk langganan ini.</p>
              )}
            </div>

            {/* Section 4: Subscription Timeline & Days Remaining */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-[10px] text-slate-400 uppercase font-extrabold block">TIMELINE MASA AKTIF LANGGANAN</span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Aktivasi (Activated At):</span>
                  <span className="font-bold text-white block mt-0.5">{formatDateJakarta(selectedSub.activatedAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tenggat (Expires At):</span>
                  <span className="font-bold text-amber-400 block mt-0.5">{formatDateJakarta(selectedSub.expiresAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Sisa Masa Aktif:</span>
                  <span className="font-black text-emerald-400 block mt-0.5">
                    {Math.max(0, Math.ceil((new Date(selectedSub.expiresAt).getTime() - now.getTime()) / (1000 * 3600 * 24)))} Hari Lagi
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Renewal:</span>
                  <span className="font-mono font-bold text-white block mt-0.5">{selectedSub.renewalCount} Kali</span>
                </div>
              </div>
            </div>

            {/* Section 5: Admin Quick Actions (Perpanjang Masa Aktif) */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-[10px] text-cyan-400 uppercase font-extrabold block">AKSI ADMIN: PERPANJANG LANGGANAN</span>

              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  disabled={isUpdating}
                  onClick={() => handleExtendSubscription(selectedSub.id, 30)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition disabled:opacity-50"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>+30 Hari (1 Bulan)</span>
                </button>

                <button
                  disabled={isUpdating}
                  onClick={() => handleExtendSubscription(selectedSub.id, 90)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition disabled:opacity-50"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>+90 Hari (3 Bulan)</span>
                </button>

                <button
                  disabled={isUpdating}
                  onClick={() => handleExtendSubscription(selectedSub.id, 365)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition disabled:opacity-50"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>+365 Hari (1 Tahun)</span>
                </button>

                {selectedSub.status === 'ACTIVE' ? (
                  <button
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus(selectedSub.id, 'CANCELLED')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 font-bold transition ml-auto disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Batalkan Langganan</span>
                  </button>
                ) : (
                  <button
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus(selectedSub.id, 'ACTIVE')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 font-bold transition ml-auto disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Aktifkan Kembali</span>
                  </button>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSub(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs"
              >
                Tutup Modal
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
