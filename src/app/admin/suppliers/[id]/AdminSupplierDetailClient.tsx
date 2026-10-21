'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Truck,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  DollarSign,
  Package,
  TrendingUp,
  Search,
  ExternalLink,
  Edit,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  FileText,
  Clock,
  Check,
  X,
  Layers,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import { Pagination } from '@/components/ui/Pagination';

type ActiveTab = 'overview' | 'inventory' | 'sales' | 'claims';

export function AdminSupplierDetailClient({ supplierId }: { supplierId: string }) {
  const router = useRouter();
  const [supplier, setSupplier] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editName, setEditName] = useState('');
  const [editContactName, setEditContactName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tab 2: Inventory State
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryTotalPages, setInventoryTotalPages] = useState(1);
  const [inventoryTotalCount, setInventoryTotalCount] = useState(0);
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState('ALL');
  const [inventorySearch, setInventorySearch] = useState('');

  // Tab 3: Sales State
  const [salesItems, setSalesItems] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesPage, setSalesPage] = useState(1);
  const [salesTotalPages, setSalesTotalPages] = useState(1);
  const [salesTotalCount, setSalesTotalCount] = useState(0);
  const [salesStatusFilter, setSalesStatusFilter] = useState('ALL');
  const [salesSearch, setSalesSearch] = useState('');

  // Tab 4: Warranty Claims State
  const [claimsItems, setClaimsItems] = useState<any[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsPage, setClaimsPage] = useState(1);
  const [claimsTotalPages, setClaimsTotalPages] = useState(1);
  const [claimsTotalCount, setClaimsTotalCount] = useState(0);
  const [claimsStatusFilter, setClaimsStatusFilter] = useState('ALL');

  // Fetch Overview Data
  const fetchSupplierDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}`);
      const json = await res.json();
      if (json.success) {
        setSupplier(json.data);
        setEditName(json.data.name || '');
        setEditStatus(json.data.status || 'ACTIVE');
        setEditContactName(json.data.contactName || '');
        setEditEmail(json.data.email || '');
        setEditPhone(json.data.phone || '');
        setEditWhatsapp(json.data.whatsapp || '');
        setEditTelegram(json.data.telegram || '');
        setEditWebsite(json.data.website || '');
        setEditNotes(json.data.notes || '');
      } else {
        toast.error(json.error || 'Supplier tidak ditemukan');
      }
    } catch {
      toast.error('Gagal memuat detail supplier');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Inventory Tab Data
  const fetchInventory = async () => {
    setInventoryLoading(true);
    try {
      let url = `/api/admin/suppliers/${supplierId}/inventory?page=${inventoryPage}&limit=15`;
      if (inventoryStatusFilter !== 'ALL') url += `&status=${inventoryStatusFilter}`;
      if (inventorySearch.trim()) url += `&search=${encodeURIComponent(inventorySearch.trim())}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setInventoryItems(json.items || []);
        setInventoryTotalPages(json.pagination?.totalPages || 1);
        setInventoryTotalCount(json.pagination?.totalItems || 0);
      }
    } catch {
      toast.error('Gagal memuat daftar inventori');
    } finally {
      setInventoryLoading(false);
    }
  };

  // Fetch Sales Tab Data
  const fetchSales = async () => {
    setSalesLoading(true);
    try {
      let url = `/api/admin/suppliers/${supplierId}/sales?page=${salesPage}&limit=15`;
      if (salesStatusFilter !== 'ALL') url += `&orderStatus=${salesStatusFilter}`;
      if (salesSearch.trim()) url += `&search=${encodeURIComponent(salesSearch.trim())}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setSalesItems(json.sales || []);
        setSalesTotalPages(json.pagination?.totalPages || 1);
        setSalesTotalCount(json.pagination?.totalSales || 0);
      }
    } catch {
      toast.error('Gagal memuat data penjualan');
    } finally {
      setSalesLoading(false);
    }
  };

  // Fetch Claims Tab Data
  const fetchClaims = async () => {
    setClaimsLoading(true);
    try {
      let url = `/api/admin/suppliers/${supplierId}/claims?page=${claimsPage}&limit=15`;
      if (claimsStatusFilter !== 'ALL') url += `&status=${claimsStatusFilter}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setClaimsItems(json.claims || []);
        setClaimsTotalPages(json.pagination?.totalPages || 1);
        setClaimsTotalCount(json.pagination?.totalClaims || 0);
      }
    } catch {
      toast.error('Gagal memuat klaim garansi');
    } finally {
      setClaimsLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplierDetail();
  }, [supplierId]);

  useEffect(() => {
    if (activeTab === 'inventory') fetchInventory();
    if (activeTab === 'sales') fetchSales();
    if (activeTab === 'claims') fetchClaims();
  }, [activeTab, inventoryPage, inventoryStatusFilter, salesPage, salesStatusFilter, claimsPage, claimsStatusFilter]);

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          status: editStatus,
          contactName: editContactName,
          email: editEmail,
          phone: editPhone,
          whatsapp: editWhatsapp,
          telegram: editTelegram,
          website: editWebsite,
          notes: editNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Informasi supplier berhasil diperbarui!');
        setIsEditModalOpen(false);
        fetchSupplierDetail();
      } else {
        toast.error(`Gagal: ${json.error}`);
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSupplier = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || `Supplier berhasil dihapus.`);
        setIsDeleteModalOpen(false);
        router.push('/admin/suppliers');
      } else {
        toast.error(`Gagal menghapus supplier: ${json.error}`);
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        <Loader2 className="h-7 w-7 animate-spin mx-auto mb-3 text-cyan-400" />
        Memuat detail dan metrik supplier...
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs space-y-4">
        <p className="text-sm font-bold text-slate-300">Supplier tidak ditemukan.</p>
        <Link href="/admin/suppliers" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-cyan-400 font-bold hover:bg-slate-700">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Supplier
        </Link>
      </div>
    );
  }

  const { metrics } = supplier;

  return (
    <div className="space-y-6 text-xs max-w-7xl mx-auto">
      
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <Link href="/admin/suppliers" className="inline-flex items-center gap-1 text-slate-400 hover:text-white mb-2 transition text-[11px]">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Daftar Supplier</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>{supplier.name}</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                {supplier.code}
              </span>
            </h1>
            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
              supplier.status === 'ACTIVE'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {supplier.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition text-xs border border-slate-700"
          >
            <Edit className="h-3.5 w-3.5 text-cyan-400" />
            <span>Edit Profil</span>
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold transition text-xs border border-rose-500/30"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            <span>Hapus Supplier</span>
          </button>
          <button
            onClick={() => {
              fetchSupplierDetail();
              if (activeTab === 'inventory') fetchInventory();
              if (activeTab === 'sales') fetchSales();
              if (activeTab === 'claims') fetchClaims();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition text-xs border border-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-px">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'inventory', label: `Inventory (${metrics?.totalInventory || 0})`, icon: Package },
          { id: 'sales', label: `Sales / Penjualan (${metrics?.unitsSold || 0})`, icon: DollarSign },
          { id: 'claims', label: `Warranty Claims (${metrics?.totalClaims || 0})`, icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition border-b-2 ${
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
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Top Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl glass-panel border border-slate-800 bg-slate-900/70 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Total Inventory</span>
                <Package className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white">{metrics?.totalInventory || 0} <span className="text-xs text-slate-500 font-normal">Unit</span></div>
              <div className="text-[11px] text-slate-400">
                <span className="text-emerald-400 font-bold">{metrics?.availableInventory || 0} Ready</span> • <span className="text-cyan-400 font-bold">{metrics?.soldInventory || 0} Terjual</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-slate-800 bg-slate-900/70 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Total Cost / Modal</span>
                <DollarSign className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-300 font-mono">{formatIDR(metrics?.totalInventoryCost || 0)}</div>
              <div className="text-[11px] text-slate-400">
                Sisa Modal Stok: <span className="text-amber-400 font-bold font-mono">{formatIDR(metrics?.remainingInventoryCost || 0)}</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-slate-800 bg-slate-900/70 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Cost of Sold (COGS)</span>
                <DollarSign className="h-4 w-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-300 font-mono">{formatIDR(metrics?.costOfInventorySold || 0)}</div>
              <div className="text-[11px] text-slate-400">
                Dari {metrics?.soldInventory || 0} inventory terjual
              </div>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-slate-800 bg-slate-900/70 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Gross Margin</span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-300 font-mono">{formatIDR(metrics?.grossMargin || 0)}</div>
              <div className="text-[11px] text-emerald-400 font-bold">
                Margin Profit: {metrics?.grossMarginPercentage || 0}%
              </div>
            </div>
          </div>

          {/* Detailed Financial & Warranty Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Financial Accounting Breakdown */}
            <div className="lg:col-span-2 rounded-2xl glass-panel border border-slate-800 bg-slate-900/70 p-6 space-y-4">
              <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span>Ringkasan Keuangan & Performa Penjualan</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px]">Gross Revenue Penjualan</span>
                  <div className="text-xl font-black text-white font-mono">{formatIDR(metrics?.revenue || 0)}</div>
                  <p className="text-[10px] text-slate-500">Total nilai penjualan dari stok supplier ini</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px]">Cost Inventory Terjual (COGS)</span>
                  <div className="text-xl font-black text-amber-300 font-mono">{formatIDR(metrics?.costOfInventorySold || 0)}</div>
                  <p className="text-[10px] text-slate-500">Berdasarkan snapshot cost saat transaksi selesai</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px]">Gross Profit / Keuntungan Bersih</span>
                  <div className="text-xl font-black text-emerald-400 font-mono">{formatIDR(metrics?.grossMargin || 0)}</div>
                  <p className="text-[10px] text-emerald-500 font-bold">Margin Margin Kotor: {metrics?.grossMarginPercentage || 0}%</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px]">Nilai Stok Tersimpan (Remaining)</span>
                  <div className="text-xl font-black text-cyan-300 font-mono">{formatIDR(metrics?.remainingInventoryCost || 0)}</div>
                  <p className="text-[10px] text-slate-500">Estimasi modal yang masih dalam bentuk stok ready</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Inventory Invalid / Rusak: <strong className="text-rose-400">{metrics?.invalidInventory || 0} unit</strong></span>
                <span>Inventory Reserved: <strong className="text-amber-400">{metrics?.reservedInventory || 0} unit</strong></span>
              </div>
            </div>

            {/* Supplier Profile & Contact Card */}
            <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/70 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4 text-cyan-400" />
                  <span>Informasi Supplier</span>
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-cyan-400 hover:text-cyan-300 font-bold text-[11px] flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" /> Edit
                </button>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <span className="text-slate-500 text-[10px] block">Nama PIC / Kontak</span>
                  <span className="font-bold text-slate-200">{supplier.contactName || '-'}</span>
                </div>

                {supplier.whatsapp && (
                  <div>
                    <span className="text-slate-500 text-[10px] block">WhatsApp</span>
                    <a href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1 font-bold">
                      <Phone className="h-3 w-3" /> {supplier.whatsapp}
                    </a>
                  </div>
                )}

                {supplier.email && (
                  <div>
                    <span className="text-slate-500 text-[10px] block">Email</span>
                    <a href={`mailto:${supplier.email}`} className="text-cyan-400 hover:underline flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {supplier.email}
                    </a>
                  </div>
                )}

                {supplier.telegram && (
                  <div>
                    <span className="text-slate-500 text-[10px] block">Telegram</span>
                    <span className="text-cyan-300 font-mono">{supplier.telegram}</span>
                  </div>
                )}

                {supplier.website && (
                  <div>
                    <span className="text-slate-500 text-[10px] block">Website / Store URL</span>
                    <a href={supplier.website} target="_blank" rel="noreferrer" className="text-slate-300 hover:underline flex items-center gap-1 truncate max-w-xs">
                      <Globe className="h-3 w-3 text-slate-400" /> {supplier.website}
                    </a>
                  </div>
                )}

                <div>
                  <span className="text-slate-500 text-[10px] block">Catatan Tambahan</span>
                  <p className="text-slate-400 text-[11px] whitespace-pre-wrap">{supplier.notes || 'Tidak ada catatan khusus.'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Warranty Claims Overview Widget */}
          <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/70 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span>Status Klaim Garansi & Recovery Supplier</span>
              </h3>
              <button
                onClick={() => setActiveTab('claims')}
                className="text-cyan-400 hover:text-cyan-300 font-bold text-[11px] flex items-center gap-1"
              >
                <span>Buka Tab Klaim</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 text-[11px]">Total Klaim Diajukan</span>
                <div className="text-xl font-bold text-white mt-0.5">{metrics?.totalClaims || 0} Kasus</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 text-[11px]">Klaim Open / Diproses</span>
                <div className="text-xl font-bold text-rose-400 mt-0.5">{metrics?.openClaims || 0} Kasus</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 text-[11px]">Klaim Selesai (Resolved)</span>
                <div className="text-xl font-bold text-emerald-400 mt-0.5">{metrics?.resolvedClaims || 0} Kasus</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 text-[11px]">Total Nilai Ter-recovery</span>
                <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{formatIDR(metrics?.recoveredAmount || 0)}</div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INVENTORY */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Cari ID, varian, ref supplier..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setInventoryPage(1);
                      fetchInventory();
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
              </div>

              <select
                value={inventoryStatusFilter}
                onChange={(e) => {
                  setInventoryStatusFilter(e.target.value);
                  setInventoryPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-slate-300 font-bold focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="AVAILABLE">AVAILABLE (Tersedia)</option>
                <option value="SOLD">SOLD (Terjual)</option>
                <option value="ASSIGNED">ASSIGNED (Digunakan)</option>
                <option value="RESERVED">RESERVED (Checkout)</option>
                <option value="INVALID">INVALID (Rusak)</option>
                <option value="EXPIRED">EXPIRED (Kadaluarsa)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Total: {inventoryTotalCount} Item</span>
              <button
                onClick={fetchInventory}
                disabled={inventoryLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition font-bold"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${inventoryLoading ? 'animate-spin' : ''}`} />
                <span>Cari</span>
              </button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">ID Inventory</th>
                    <th className="py-3 px-4">Produk & Varian</th>
                    <th className="py-3 px-4">Modal Cost</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Tanggal Masuk</th>
                    <th className="py-3 px-4">Assigned Order</th>
                    <th className="py-3 px-4">Customer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                  {inventoryLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-cyan-400" />
                        Memuat data inventori...
                      </td>
                    </tr>
                  ) : inventoryItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">Tidak ada inventori yang sesuai dengan filter.</td>
                    </tr>
                  ) : (
                    inventoryItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {item.id}
                            </span>
                            {item.deliveryModel && (
                              <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] border ${
                                item.deliveryModel === 'DEDICATED'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                  : item.deliveryModel === 'SHARED_SLOT'
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}>
                                {item.deliveryModel}
                              </span>
                            )}
                          </div>
                          {item.supplierReference && (
                            <div className="text-[10px] text-amber-400 font-mono mt-0.5">Ref: {item.supplierReference}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{item.productName}</div>
                          <div className="text-[11px] text-slate-400">{item.variantName}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-300">
                          {formatIDR(item.costAmount || 0)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            item.status === 'AVAILABLE'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : item.status === 'SOLD' || item.status === 'ASSIGNED'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : item.status === 'RESERVED'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {item.purchasedAt ? formatDateJakarta(item.purchasedAt) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {item.assignedOrderNumber ? (
                            <Link
                              href={`/admin/orders/${item.assignedOrderId || ''}`}
                              className="font-mono text-cyan-400 hover:underline font-bold"
                            >
                              {item.assignedOrderNumber}
                            </Link>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {item.assignedCustomer || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={inventoryPage}
              totalPages={inventoryTotalPages}
              totalItems={inventoryTotalCount}
              itemsPerPage={15}
              onPageChange={setInventoryPage}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SALES */}
      {/* ========================================================================= */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Cari order #, nama produk..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSalesPage(1);
                      fetchSales();
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
              </div>

              <select
                value={salesStatusFilter}
                onChange={(e) => {
                  setSalesStatusFilter(e.target.value);
                  setSalesPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-slate-300 font-bold focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">Status: PAID / COMPLETED</option>
                <option value="PAID">Hanya PAID</option>
                <option value="COMPLETED">Hanya COMPLETED</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Total: {salesTotalCount} Transaksi</span>
              <button
                onClick={fetchSales}
                disabled={salesLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition font-bold"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${salesLoading ? 'animate-spin' : ''}`} />
                <span>Cari</span>
              </button>
            </div>
          </div>

          {/* Sales Table */}
          <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Produk & Varian</th>
                    <th className="py-3 px-4">Harga Jual</th>
                    <th className="py-3 px-4">Supplier Cost</th>
                    <th className="py-3 px-4">Gross Margin</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Customer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                  {salesLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-cyan-400" />
                        Memuat data transaksi penjualan...
                      </td>
                    </tr>
                  ) : salesItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">Belum ada transaksi penjualan untuk supplier ini.</td>
                    </tr>
                  ) : (
                    salesItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold">
                          <Link href={`/admin/orders/${item.orderId}`} className="text-cyan-400 hover:underline">
                            {item.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {formatDateJakarta(item.date)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{item.productName}</div>
                          <div className="text-[11px] text-slate-400">{item.variantName}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {formatIDR(item.sellingPrice)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-300">
                          {formatIDR(item.supplierCost)}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <div className="font-bold text-emerald-400">{formatIDR(item.grossMargin)}</div>
                          <div className="text-[10px] text-emerald-500">{item.grossMarginPercentage}%</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {item.customer || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={salesPage}
              totalPages={salesTotalPages}
              totalItems={salesTotalCount}
              itemsPerPage={15}
              onPageChange={setSalesPage}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: WARRANTY CLAIMS */}
      {/* ========================================================================= */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          {/* Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <select
                value={claimsStatusFilter}
                onChange={(e) => {
                  setClaimsStatusFilter(e.target.value);
                  setClaimsPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-slate-300 font-bold focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">Semua Status Klaim</option>
                <option value="OPEN">OPEN / BARU</option>
                <option value="WAITING_SUPPLIER">WAITING SUPPLIER</option>
                <option value="RESOLVED_REPLACEMENT">RESOLVED (Replacement)</option>
                <option value="RESOLVED_REFUND">RESOLVED (Refund)</option>
                <option value="RESOLVED_CREDIT">RESOLVED (Credit)</option>
                <option value="REJECTED_INTERNAL">REJECTED</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Total: {claimsTotalCount} Klaim</span>
              <button
                onClick={fetchClaims}
                disabled={claimsLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition font-bold"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${claimsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Claims Table */}
          <div className="rounded-2xl glass-panel border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">No. Klaim</th>
                    <th className="py-3 px-4">Tanggal Diajukan</th>
                    <th className="py-3 px-4">Alasan Masalah</th>
                    <th className="py-3 px-4">Nilai Klaim</th>
                    <th className="py-3 px-4">Status Klaim</th>
                    <th className="py-3 px-4">Resolusi / Catatan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                  {claimsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-cyan-400" />
                        Memuat riwayat klaim garansi...
                      </td>
                    </tr>
                  ) : claimsItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">Belum ada catatan klaim garansi untuk supplier ini.</td>
                    </tr>
                  ) : (
                    claimsItems.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                          {c.claimNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {formatDateJakarta(c.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-slate-200">
                          {c.failureReason || 'Kendala Akun'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-300">
                          {formatIDR(c.claimAmount || 0)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            c.status.startsWith('RESOLVED')
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : c.status === 'WAITING_SUPPLIER'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                          {c.lastResponse || c.notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/admin/suppliers/claims`}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold transition text-[11px]"
                          >
                            <span>Kelola Klaim</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={claimsPage}
              totalPages={claimsTotalPages}
              totalItems={claimsTotalCount}
              itemsPerPage={15}
              onPageChange={setClaimsPage}
            />
          </div>
        </div>
      )}

      {/* Edit Supplier Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <form onSubmit={handleUpdateSupplier} className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Edit Informasi Supplier</h3>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold text-[11px] mb-1">Nama Supplier</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold text-[11px] mb-1">Status Supplier</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white font-bold focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold text-[11px] mb-1">Nama Kontak / PIC</label>
                  <input
                    type="text"
                    value={editContactName}
                    onChange={(e) => setEditContactName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold text-[11px] mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold text-[11px] mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold text-[11px] mb-1">Telegram</label>
                  <input
                    type="text"
                    value={editTelegram}
                    onChange={(e) => setEditTelegram(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold text-[11px] mb-1">Website</label>
                <input
                  type="text"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold text-[11px] mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold transition text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition text-xs flex items-center gap-1.5"
              >
                {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Supplier Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Hapus Supplier?</h3>
                <p className="text-slate-400 text-[11px]">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs text-slate-300">
              <div>
                Nama: <strong className="text-white">{supplier.name}</strong> ({supplier.code})
              </div>
              <p className="text-[11px] text-slate-400">
                Semua referensi supplier pada inventori, riwayat transaksi, dan batch akan dilepas secara aman (*unlinked*) tanpa merusak data penjualan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold transition text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteSupplier}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold transition text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/20"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Supplier'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
