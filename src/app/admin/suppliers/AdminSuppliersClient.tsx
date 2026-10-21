'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  FileText,
  Loader2,
  Package,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatIDR } from '@/lib/utils/formatters';
import { Pagination } from '@/components/ui/Pagination';

export function AdminSuppliersClient() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [supplierToDelete, setSupplierToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [telegram, setTelegram] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/suppliers');
      const json = await res.json();
      if (json.success) {
        setSuppliers(json.data);
      }
    } catch {
      toast.error('Gagal memuat data supplier');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nama supplier wajib diisi');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contactName, email, phone, whatsapp, telegram, website, notes }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Supplier ${json.data.name} (${json.data.code}) berhasil ditambahkan!`);
        setIsModalOpen(false);
        setName('');
        setContactName('');
        setEmail('');
        setPhone('');
        setWhatsapp('');
        setTelegram('');
        setWebsite('');
        setNotes('');
        fetchSuppliers();
      } else {
        toast.error(`Gagal: ${json.error}`);
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplierToDelete.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || `Supplier ${supplierToDelete.name} berhasil dihapus.`);
        setSupplierToDelete(null);
        fetchSuppliers();
      } else {
        toast.error(`Gagal menghapus supplier: ${json.error}`);
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactName && s.contactName.toLowerCase().includes(search.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
  );

  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Overall Global Aggregates
  const totalSuppliersCount = suppliers.length;
  const totalAllInventory = suppliers.reduce((sum, s) => sum + (s.metrics?.totalInventory || 0), 0);
  const totalAvailableInventory = suppliers.reduce((sum, s) => sum + (s.metrics?.availableInventory || 0), 0);
  const totalSoldInventory = suppliers.reduce((sum, s) => sum + (s.metrics?.soldInventory || 0), 0);
  const totalInventoryCost = suppliers.reduce((sum, s) => sum + (s.metrics?.totalInventoryCost || 0), 0);
  const totalSoldCost = suppliers.reduce((sum, s) => sum + (s.metrics?.costOfInventorySold || 0), 0);
  const totalRevenue = suppliers.reduce((sum, s) => sum + (s.metrics?.revenue || 0), 0);
  const totalGrossMargin = totalRevenue - totalSoldCost;
  const totalGrossMarginPct = totalRevenue > 0 ? Number(((totalGrossMargin / totalRevenue) * 100).toFixed(1)) : 0;
  const totalOpenClaims = suppliers.reduce((sum, s) => sum + (s.metrics?.openClaims || 0), 0);

  return (
    <div className="space-y-6 text-xs max-w-7xl mx-auto">
      
      {/* Header Banner Box Card (Exact match with Inventory screenshot header box) */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-extrabold uppercase tracking-wider">
              <Truck className="h-3.5 w-3.5" />
              <span>SUPPLIER &amp; VENDOR MANAGEMENT</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Supplier &amp; Vendor
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Kelola data vendor lisensi, integrasi modal inventori, status klaim garansi, dan profitabilitas vendor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/admin/suppliers/claims"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-800 bg-[#0e131f] hover:bg-slate-800 text-slate-200 font-bold text-xs transition"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              <span>Klaim Garansi</span>
            </Link>
            <Link
              href="/admin/suppliers/policies"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-800 bg-[#0e131f] hover:bg-slate-800 text-slate-200 font-bold text-xs transition"
            >
              <FileText className="h-3.5 w-3.5 text-purple-400" />
              <span>Kebijakan SLA</span>
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#00b4d8] hover:bg-cyan-300 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Tambah Supplier</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Global Statistics (Matches Inventory metric cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800/80 bg-[#0c1019] p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Supplier</p>
          <p className="text-2xl font-black text-white">{suppliers.length} <span className="text-xs text-slate-500 font-normal">Partner</span></p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-[#161208] p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Total Nilai Modal Stok</p>
          <p className="text-2xl font-black text-amber-300 font-mono">{formatIDR(totalInventoryCost)}</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-[#081711] p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Total Omset Penjualan</p>
          <p className="text-2xl font-black text-emerald-400 font-mono">{formatIDR(totalRevenue)}</p>
        </div>

        <div className="rounded-2xl border border-rose-500/30 bg-[#1e0a0d] p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Open Warranty Claims</p>
          <p className="text-2xl font-black text-rose-300">{totalOpenClaims} <span className="text-xs text-rose-500 font-normal">Kasus</span></p>
        </div>
      </div>

      {/* Main Table Panel (Matches Inventory main panel container style) */}
      <div className="rounded-3xl border border-slate-800/80 bg-[#0c1019] p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Cari nama, kode SUP-xxx, PIC, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#070a10] border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSuppliers}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-800 bg-[#0e131f] hover:bg-slate-800 text-slate-300 text-xs font-bold transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#080b11] border-b border-slate-800/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">SUPPLIER / VENDOR</th>
                <th className="py-3.5 px-4">KONTAK PIC</th>
                <th className="py-3.5 px-4">INVENTORI</th>
                <th className="py-3.5 px-4">MODAL STOK</th>
                <th className="py-3.5 px-4">REVENUE</th>
                <th className="py-3.5 px-4">GROSS MARGIN</th>
                <th className="py-3.5 px-4">KLAIM GARANSI</th>
                <th className="py-3.5 px-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Memuat data supplier & metrik keuangan...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Belum ada supplier yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          {s.code}
                        </span>
                        <span className="font-extrabold text-white text-sm">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {s.status}
                        </span>
                        {s.website && (
                          <a href={s.website} target="_blank" rel="noreferrer" className="text-[10px] text-slate-400 hover:text-cyan-400 truncate max-w-[150px]">
                            {s.website.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-200">{s.contactName || '-'}</div>
                      <div className="text-[10px] text-slate-400 flex flex-col gap-0.5 mt-0.5">
                        {s.whatsapp && <span className="text-emerald-400">WA: {s.whatsapp}</span>}
                        {s.telegram && <span className="text-cyan-400 font-mono">{s.telegram}</span>}
                        {s.email && <span className="truncate max-w-[140px]">{s.email}</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-xs">{s.metrics?.totalInventory || 0} unit</div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-emerald-400 font-bold">{s.metrics?.availableInventory || 0} ready</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-cyan-400">{s.metrics?.soldInventory || 0} sold</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-amber-300 font-mono">{formatIDR(s.metrics?.totalInventoryCost || 0)}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Sold: {formatIDR(s.metrics?.costOfInventorySold || 0)}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {formatIDR(s.metrics?.revenue || 0)}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-purple-300">{formatIDR(s.metrics?.grossMargin || 0)}</div>
                      <div className="text-[10px] text-purple-400">{s.metrics?.grossMarginPercentage || 0}%</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {s.metrics?.openClaims > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] border border-rose-500/30">
                          <AlertTriangle className="h-3 w-3" /> {s.metrics.openClaims} Open
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" /> 0 Open
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/suppliers/${s.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold transition text-[11px]"
                        >
                          <span>Detail</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        <button
                          onClick={() => setSupplierToDelete(s)}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition hover:text-rose-300"
                          title="Hapus Supplier"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredSuppliers.length / itemsPerPage)}
          totalItems={filteredSuppliers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <form onSubmit={handleCreateSupplier} className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Truck className="h-5 w-5 text-cyan-400" />
                <span>Tambah Supplier Baru</span>
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold text-[11px] mb-1">Nama Supplier / Vendor *</label>
                <input
                  type="text"
                  placeholder="Contoh: Supplier Digital Global"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold text-[11px] mb-1">Nama Kontak / PIC</label>
                  <input
                    type="text"
                    placeholder="Contoh: Budi Santoso"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold text-[11px] mb-1">Email Kontak</label>
                  <input
                    type="email"
                    placeholder="supplier@vendor.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold text-[11px] mb-1">WhatsApp</label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold text-[11px] mb-1">Telegram (Opsional)</label>
                  <input
                    type="text"
                    placeholder="@supplier_official"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold text-[11px] mb-1">Website / Marketplace URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold text-[11px] mb-1">Catatan Internal</label>
                <textarea
                  rows={2}
                  placeholder="Catatan ketentuan garansi, terms, atau jam operasional supplier..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold transition text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition text-xs flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Simpan Supplier</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Supplier Confirmation Modal */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-6 space-y-4 shadow-2xl">
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
                Nama: <strong className="text-white">{supplierToDelete.name}</strong> ({supplierToDelete.code})
              </div>
              <p className="text-[11px] text-slate-400">
                Semua referensi supplier pada inventori, riwayat order, dan batch akan dilepas secara aman (*unlinked*) tanpa merusak data transaksi.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setSupplierToDelete(null)}
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
