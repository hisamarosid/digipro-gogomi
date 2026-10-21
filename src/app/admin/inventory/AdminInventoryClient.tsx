'use client';

import React, { useState, useEffect } from 'react';
import { formatRevealedPayload } from '@/lib/security/encryption';
import { FormattedCredentialView, extractFirstUrl } from '@/components/common/FormattedCredentialView';
import Link from 'next/link';
import {
  Key,
  Plus,
  Clock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Search,
  Trash2,
  Archive,
  RefreshCw,
  BarChart2,
  Users,
  UserPlus,
  ShieldCheck,
  Filter,
  ArrowRight,
  Eye,
  EyeOff,
  Copy,
  Lock,
  X,
  Edit2,
  Package,
  Layers,
  Truck,
  DollarSign,
  Check,
  Calendar,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/Pagination';
import { VerificationAccessConfigSection, VerificationAccessState } from '@/components/admin/VerificationAccessConfigSection';
import { formatDateJakarta, formatIDR } from '@/lib/utils/formatters';

interface AdminInventoryClientProps {
  variants: any[];
  suppliers?: any[];
  initialInventoryItems: any[];
  initialSharedAccounts?: any[];
  initialFamilyGroups?: any[];
  sharedSlotsCount?: number;
  familySlotsCount?: number;
  variantStockMap?: Record<string, number>;
}

type ActiveViewTab = 'all_stock' | 'variant_matrix';

export function AdminInventoryClient({
  variants,
  suppliers = [],
  initialInventoryItems,
  initialSharedAccounts = [],
  initialFamilyGroups = [],
  sharedSlotsCount = 0,
  familySlotsCount = 0,
  variantStockMap = {},
}: AdminInventoryClientProps) {
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('all_stock');

  // Form Add Stock Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id || '');
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [supplierReference, setSupplierReference] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideUnit, setOverrideUnit] = useState('HOURS');
  const [costAmount, setCostAmount] = useState('');
  const [customExpiresAt, setCustomExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Stock Item Modal State
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState('AVAILABLE');
  const [editCost, setEditCost] = useState('');
  const [editSupplierId, setEditSupplierId] = useState('');
  const [editSupplierRef, setEditSupplierRef] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Filters & Search
  const [activeStatusFilter, setActiveStatusFilter] = useState('ALL');
  const [activeVariantFilter, setActiveVariantFilter] = useState('ALL');
  const [activeSupplierFilter, setActiveSupplierFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryItems, setInventoryItems] = useState<any[]>(initialInventoryItems);
  const [now, setNow] = useState<Date>(new Date());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [verificationConfig, setVerificationConfig] = useState<VerificationAccessState>({
    verificationRequired: false,
    verificationMethod: 'NONE',
    verificationEmail: '',
    verificationAccessUrl: '',
    verificationMailboxId: '',
    verificationProvider: 'GENERIC',
    verificationInstructions: '',
  });

  const [editVerificationConfig, setEditVerificationConfig] = useState<VerificationAccessState>({
    verificationRequired: false,
    verificationMethod: 'NONE',
    verificationEmail: '',
    verificationAccessUrl: '',
    verificationMailboxId: '',
    verificationProvider: 'GENERIC',
    verificationInstructions: '',
  });

  // Sensitive credential reveal state
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [revealedData, setRevealedData] = useState<Record<string, string>>({});
  const [revealModalItem, setRevealModalItem] = useState<any | null>(null);
  const [isPayloadVisible, setIsPayloadVisible] = useState(true);

  const handleReveal = async (item: any) => {
    setRevealingId(item.id);
    try {
      const res = await fetch(`/api/admin/inventory/${item.id}/reveal`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Gagal mengungkap kredensial');
        return;
      }
      let plain = json.data.plainPayload;
      if (typeof plain === 'string') {
        plain = formatRevealedPayload(plain);
      }
      if (typeof plain === 'string' && (plain.startsWith('{"cipher"') || plain.startsWith('{"payloadCipher"'))) {
        plain = '[Gagal Dekripsi: Kredensial dienkripsi dengan kunci berbeda. Harap perbarui kredensial via Edit Modal.]';
      }
      setRevealedData((prev) => ({ ...prev, [item.id]: plain }));
      setRevealModalItem({ ...item, plainPayload: plain });
      setIsPayloadVisible(true);
      toast.success('Kredensial berhasil didekripsi & dicatat ke Audit Log.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengungkap kredensial');
    } finally {
      setRevealingId(null);
    }
  };

  // Live ticking clock for countdown updates
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  // Set default cost when variant changes in Add Modal
  useEffect(() => {
    if (selectedVariant && selectedVariant.defaultCostAmount) {
      setCostAmount(String(selectedVariant.defaultCostAmount));
    }
  }, [selectedVariantId]);

  // Calculate preview expiresAt date before submitting
  const calculatePreviewExpiry = () => {
    if (customExpiresAt) return new Date(customExpiresAt);
    if (!selectedVariant) return null;
    const baseDate = new Date();

    if (overrideValue.trim()) {
      const val = parseInt(overrideValue) || 0;
      const hours = overrideUnit === 'DAYS' ? val * 24 : val;
      return new Date(baseDate.getTime() + hours * 3600 * 1000);
    }

    if (selectedVariant.credentialExpirationEnabled && selectedVariant.credentialDeliveryValidityHours) {
      return new Date(baseDate.getTime() + selectedVariant.credentialDeliveryValidityHours * 3600 * 1000);
    }

    return null;
  };

  const previewExpiryDate = calculatePreviewExpiry();

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim() || !selectedVariantId) return;

    setIsSubmitting(true);
    try {
      const rawLines = bulkText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      if (rawLines.length === 0) {
        toast.error('Masukkan setidaknya satu baris kredensial atau lisensi');
        return;
      }

      let validityHoursOverride: number | null = null;
      if (overrideValue.trim()) {
        const val = parseInt(overrideValue) || 0;
        validityHoursOverride = overrideUnit === 'DAYS' ? val * 24 : val;
      }

      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: selectedVariantId,
          payloads: rawLines,
          deliveryType: selectedVariant?.deliveryType || 'LICENSE_KEY',
          deliveryValidityHoursOverride: validityHoursOverride,
          customExpiresAt: customExpiresAt || null,
          costAmount: costAmount ? Number(costAmount) : null,
          supplierId: selectedSupplierId || null,
          supplierReference: supplierReference.trim() || null,
          verificationRequired: verificationConfig.verificationRequired,
          verificationMethod: verificationConfig.verificationMethod,
          verificationEmail: verificationConfig.verificationEmail || null,
          verificationAccessUrl: verificationConfig.verificationAccessUrl || null,
          verificationMailboxId: verificationConfig.verificationMailboxId || null,
          verificationProvider: verificationConfig.verificationProvider || null,
          verificationInstructions: verificationConfig.verificationInstructions || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Gagal menambahkan stok');
        return;
      }

      toast.success(`Berhasil menambahkan ${rawLines.length} item stok digital!`);
      setBulkText('');
      setOverrideValue('');
      setSupplierReference('');
      setCustomExpiresAt('');
      setIsAddModalOpen(false);

      // Refresh list
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambahkan stok');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    setEditStatus(item.status || 'AVAILABLE');
    setEditCost(item.costAmount != null ? String(item.costAmount) : '');
    setEditSupplierId(item.supplierId || '');
    setEditSupplierRef(item.supplierReference || '');
    setEditVerificationConfig({
      verificationRequired: Boolean(item.verificationRequired),
      verificationMethod: item.verificationMethod || 'NONE',
      verificationEmail: item.verificationEmail || '',
      verificationAccessUrl: item.verificationAccessUrl || '',
      verificationMailboxId: item.verificationMailboxId || '',
      verificationProvider: item.verificationProvider || 'GENERIC',
      verificationInstructions: item.verificationInstructions || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/inventory/${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          costAmount: editCost ? Number(editCost) : 0,
          supplierId: editSupplierId || null,
          supplierReference: editSupplierRef.trim() || null,
          verificationRequired: editVerificationConfig.verificationRequired,
          verificationMethod: editVerificationConfig.verificationMethod,
          verificationEmail: editVerificationConfig.verificationEmail || null,
          verificationAccessUrl: editVerificationConfig.verificationAccessUrl || null,
          verificationMailboxId: editVerificationConfig.verificationMailboxId || null,
          verificationProvider: editVerificationConfig.verificationProvider || null,
          verificationInstructions: editVerificationConfig.verificationInstructions || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Gagal memperbarui item inventori');
        return;
      }

      toast.success('Item inventori berhasil diperbarui!');
      setInventoryItems((prev) =>
        prev.map((it) => (it.id === editItem.id ? { ...it, ...json.data } : it))
      );
      setEditItem(null);
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Filter Inventory
  const filteredItems = inventoryItems.filter((item) => {
    const matchesStatus =
      activeStatusFilter === 'ALL' || item.status === activeStatusFilter;
    const matchesVariant =
      activeVariantFilter === 'ALL' || item.variantId === activeVariantFilter;
    const matchesSupplier =
      activeSupplierFilter === 'ALL' || item.supplierId === activeSupplierFilter;
    const matchesSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.variant?.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.variant?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.supplierReference && item.supplierReference.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesVariant && matchesSupplier && matchesSearch;
  });

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Overall Statistics
  const totalCount = inventoryItems.length;
  const availableCount = inventoryItems.filter((i) => i.status === 'AVAILABLE').length;
  const soldCount = inventoryItems.filter((i) => i.status === 'SOLD' || i.status === 'ASSIGNED').length;
  const invalidCount = inventoryItems.filter((i) => i.status === 'INVALID' || i.status === 'DISABLED').length;
  const totalCostSum = inventoryItems.reduce((sum, it) => sum + (it.costAmount || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Key className="h-3.5 w-3.5" />
              <span>Inventory &amp; Stock Control</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Stok Digital &amp; Kredensial
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Kelola stok akun dedicated, serial key, akun bersama (shared), dan grup family dengan enkripsi AES-256-GCM, auto FEFO, audit log, serta tracking supplier.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/admin/inventory/shared"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold text-xs transition"
            >
              <Users className="h-4 w-4 text-cyan-400" />
              <span>Akun Shared ({initialSharedAccounts.length})</span>
            </Link>
            <Link
              href="/admin/inventory/families"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 font-bold text-xs transition"
            >
              <UserPlus className="h-4 w-4 text-indigo-400" />
              <span>Grup Family ({initialFamilyGroups.length})</span>
            </Link>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Stok Digital</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Stok Dedicated</p>
          <p className="text-2xl font-black text-white">{totalCount} <span className="text-xs text-slate-500 font-normal">Unit</span></p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Stok Ready (Available)</p>
          <p className="text-2xl font-black text-emerald-300">{availableCount} <span className="text-xs text-emerald-500 font-normal">Ready</span></p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Terjual / Digunakan</p>
          <p className="text-2xl font-black text-cyan-300">{soldCount} <span className="text-xs text-cyan-500 font-normal">Sold</span></p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Total Nilai Modal Stok</p>
          <p className="text-2xl font-black text-amber-300 font-mono">{formatIDR(totalCostSum)}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-px overflow-x-auto">
        {[
          { id: 'all_stock', label: `Stok Dedicated / Key (${inventoryItems.length})`, icon: Key },
          { id: 'variant_matrix', label: `Ringkasan Per Varian (${variants.length})`, icon: Package },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveViewTab)}
              className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl font-bold text-xs transition border-b-2 whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL STOCK TABLE */}
      {/* ========================================================================= */}
      {activeTab === 'all_stock' && (
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari ID, varian, ref supplier..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Status Filter */}
              <select
                value={activeStatusFilter}
                onChange={(e) => {
                  setActiveStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="AVAILABLE">Tersedia (Ready)</option>
                <option value="SOLD">Terjual (Sold)</option>
                <option value="ASSIGNED">Dialokasikan (Assigned)</option>
                <option value="INVALID">Bermasalah (Invalid)</option>
                <option value="DISABLED">Non-Aktif (Disabled)</option>
                <option value="EXPIRED">Kedaluwarsa (Expired)</option>
              </select>

              {/* Variant Filter */}
              <select
                value={activeVariantFilter}
                onChange={(e) => {
                  setActiveVariantFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:border-cyan-500 focus:outline-none max-w-xs truncate"
              >
                <option value="ALL">Semua Produk &amp; Varian</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.product?.name} — {v.name}
                  </option>
                ))}
              </select>

              {/* Supplier Filter */}
              <select
                value={activeSupplierFilter}
                onChange={(e) => {
                  setActiveSupplierFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-300 font-bold focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">Semua Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.code}] {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="p-3.5">ID / Ref</th>
                  <th className="p-3.5">Produk &amp; Varian</th>
                  <th className="p-3.5">Supplier Asal</th>
                  <th className="p-3.5">Tipe &amp; Modal</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Masa Berlaku (FEFO)</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                      Tidak ada data stok digital yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => {
                    const isExp = item.expiresAt && new Date(item.expiresAt) < now;
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3.5 font-mono text-slate-300">
                          <span className="font-bold text-white">#{item.id.slice(-6).toUpperCase()}</span>
                          {item.supplierReference && (
                            <span className="block text-[10px] text-slate-400">Ref: {item.supplierReference}</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-white">{item.variant?.product?.name}</div>
                          <div className="text-[11px] text-cyan-400 font-mono">{item.variant?.name}</div>
                        </td>
                        <td className="p-3.5">
                          {item.supplier ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                              <Truck className="h-3 w-3 text-cyan-400" />
                              <span>{item.supplier.name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono text-emerald-400 font-bold">
                            {formatIDR(item.costAmount || 0)}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                item.status === 'AVAILABLE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : item.status === 'SOLD' || item.status === 'ASSIGNED'
                                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {item.status}
                            </span>
                            {(item.status === 'INVALID' || item.status === 'DISABLED') && (
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black uppercase flex items-center gap-1 animate-pulse">
                                <ShieldAlert className="h-3 w-3 text-rose-400" />
                                <span>STOK RUSAK / NON-AKTIF</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                          {item.expiresAt ? formatDateJakarta(item.expiresAt) : 'Selamanya'}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleReveal(item)}
                              className="p-1.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-400 transition"
                              title="Reveal Kredensial"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              title="Edit Item"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredItems.length / itemsPerPage) || 1}
            totalItems={filteredItems.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VARIANT MATRIX GRID */}
      {/* ========================================================================= */}
      {activeTab === 'variant_matrix' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {variants.map((v) => {
              const readyStock = variantStockMap[v.id] || 0;
              const isOutOfStock = readyStock === 0;
              const isLowStock = readyStock > 0 && readyStock <= 3;

              return (
                <div key={v.id} className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-3 relative overflow-hidden flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {v.sku}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        isOutOfStock
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : isLowStock
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {isOutOfStock ? 'STOK HABIS' : isLowStock ? 'STOK TIPIS' : 'READY'}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-white text-sm tracking-tight">{v.product?.name}</h3>
                    <p className="text-xs text-slate-400">{v.name}</p>

                    <div className="pt-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Harga Jual</span>
                        <span className="font-bold text-white font-mono">{formatIDR(v.price)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] block">Modal Default</span>
                        <span className="font-bold text-amber-400 font-mono">{formatIDR(v.defaultCostAmount || 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-[11px]">Sisa Stok Ready: </span>
                      <strong className={`text-sm ${isOutOfStock ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {readyStock} Unit
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(v.id);
                        if (v.defaultCostAmount) setCostAmount(String(v.defaultCostAmount));
                        setIsAddModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Isi Stok</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH STOK DIGITAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto">
          <form onSubmit={handleBulkAdd} className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-cyan-400" />
                <h3 className="font-extrabold text-white text-base">Tambah Stok Digital / Kredensial</h3>
              </div>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Product & Variant Selector */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Pilih Produk &amp; Varian Target *</label>
                <select
                  required
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold focus:border-cyan-500 focus:outline-none"
                >
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.product?.name} — {v.name} (Rp {v.price.toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier & Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Supplier Pemasok</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">Tanpa Supplier (In-house)</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">No. Referensi / Invoice Supplier</label>
                  <input
                    type="text"
                    value={supplierReference}
                    onChange={(e) => setSupplierReference(e.target.value)}
                    placeholder="Contoh: INV-SUP-2026-089"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Modal Cost & Custom Expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Modal Cost Per Item (IDR)</label>
                  <input
                    type="number"
                    value={costAmount}
                    onChange={(e) => setCostAmount(e.target.value)}
                    placeholder="Contoh: 25000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Custom Tanggal Kadaluarsa</label>
                  <input
                    type="datetime-local"
                    value={customExpiresAt}
                    onChange={(e) => setCustomExpiresAt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Textarea for Bulk Payloads */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold block">Daftar Kredensial / License Key (1 Baris = 1 Item) *</label>
                  <span className="text-[11px] text-cyan-400 font-mono font-bold">
                    {bulkText.split('\n').filter((l) => l.trim()).length} Item terdeteksi
                  </span>
                </div>
                <textarea
                  required
                  rows={5}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`user1@netflix.com:pass123\nuser2@netflix.com:pass456\nXXXX-YYYY-ZZZZ-AAAA`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* VERIFICATION ACCESS CONFIGURATION SECTION */}
              <VerificationAccessConfigSection
                value={verificationConfig}
                onChange={setVerificationConfig}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold transition text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !bulkText.trim()}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition text-xs flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span>Simpan Stok Digital</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT STOK ITEM */}
      {/* ========================================================================= */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <form onSubmit={handleSaveEdit} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-base">Edit Item Inventori</h3>
              <button type="button" onClick={() => setEditItem(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Status Stok</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold focus:border-cyan-500 focus:outline-none"
                >
                  <option value="AVAILABLE">AVAILABLE (Tersedia / Siap Jual)</option>
                  <option value="RESERVED">RESERVED (Terkunci Checkout)</option>
                  <option value="SOLD">SOLD (Terjual)</option>
                  <option value="ASSIGNED">ASSIGNED (Digunakan)</option>
                  <option value="INVALID">INVALID (Rusak / Karantina)</option>
                  <option value="DISABLED">DISABLED (Dinonaktifkan)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Modal Cost (IDR)</label>
                <input
                  type="number"
                  value={editCost}
                  onChange={(e) => setEditCost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Supplier Pemasok</label>
                <select
                  value={editSupplierId}
                  onChange={(e) => setEditSupplierId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">Tanpa Supplier (In-house)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">No. Referensi Supplier</label>
                <input
                  type="text"
                  value={editSupplierRef}
                  onChange={(e) => setEditSupplierRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* VERIFICATION ACCESS CONFIGURATION SECTION */}
              <VerificationAccessConfigSection
                value={editVerificationConfig}
                onChange={setEditVerificationConfig}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold transition text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition text-xs flex items-center gap-1.5"
              >
                {isSavingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REVEAL SENSITIVE CREDENTIAL */}
      {/* ========================================================================= */}
      {revealModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
                <h3 className="font-extrabold text-white text-base">Dekripsi Kredensial Digital</h3>
              </div>
              <button type="button" onClick={() => setRevealModalItem(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px]">
                Aktivitas membuka kredensial ini telah dicatat ke <strong>Audit Log</strong> demi keamanan data.
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block">Item ID / Produk</span>
                <span className="font-bold text-white text-xs">{revealModalItem.variant?.product?.name} — {revealModalItem.variant?.name}</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold text-xs">Isi Kredensial / Serial Key:</span>
                  <button
                    type="button"
                    onClick={() => setIsPayloadVisible(!isPayloadVisible)}
                    className="text-cyan-400 hover:text-cyan-300 font-bold text-[11px] flex items-center gap-1"
                  >
                    {isPayloadVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{isPayloadVisible ? 'Sembunyikan' : 'Tampilkan'}</span>
                  </button>
                </div>

                <div className="relative p-3 rounded-xl bg-slate-950 border border-slate-800">
                  {isPayloadVisible ? (
                    <FormattedCredentialView content={revealModalItem.plainPayload} />
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">••••••••••••••••••••••••••••••••</span>
                  )}
                  {isPayloadVisible && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(revealModalItem.plainPayload);
                        toast.success('Kredensial berhasil disalin ke clipboard!');
                      }}
                      className="absolute right-2.5 top-2.5 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
                      title="Salin Kredensial"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              {isPayloadVisible && extractFirstUrl(revealModalItem.plainPayload) && (
                <a
                  href={extractFirstUrl(revealModalItem.plainPayload)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition text-xs inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Buka Link</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setRevealModalItem(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
