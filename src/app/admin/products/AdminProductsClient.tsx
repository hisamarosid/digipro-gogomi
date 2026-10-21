'use client';

import React, { useState } from 'react';
import { formatIDR } from '@/lib/utils/formatters';
import { Package, Search, Filter, Plus, ExternalLink, Tag, ShieldCheck, AlertCircle, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { Pagination } from '@/components/ui/Pagination';

interface AdminProductsClientProps {
  products: any[];
  categories: any[];
}

export function AdminProductsClient({ products, categories }: AdminProductsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || p.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalProductsCount = products.length;
  const activeProductsCount = products.filter((p) => p.status === 'ACTIVE').length;
  const draftProductsCount = products.filter((p) => p.status === 'DRAFT').length;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Package className="h-3.5 w-3.5" />
              <span>Catalog &amp; Product Management</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Produk Digital
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Kelola katalog produk digital, konfigurasi varian multi-tier, model pengiriman otomatis, dan visibilitas di etalase toko.
            </p>
          </div>

          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Produk Baru</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Produk</p>
          <p className="text-2xl font-black text-white">{totalProductsCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Produk Aktif</p>
          <p className="text-2xl font-black text-emerald-300">{activeProductsCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Draft / Inaktif</p>
          <p className="text-2xl font-black text-amber-300">{draftProductsCount}</p>
        </div>
      </div>

      {/* Admin List Card */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        
        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Cari nama produk atau SKU..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 font-bold focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 font-bold focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Produk</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Varian &amp; Harga</th>
                <th className="py-3 px-4">Stok Tersedia</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Tidak ada produk ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const minPrice = p.variants?.reduce(
                    (min: number, v: any) => (v.price < min ? v.price : min),
                    p.variants[0]?.price || 0
                  );

                  const totalAvailableStock = p.variants?.reduce(
                    (acc: number, v: any) => acc + (v.availableStock ?? v.availableStockCount ?? 0),
                    0
                  );

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition text-xs">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                            {p.thumbnail ? (
                              <img src={p.thumbnail} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-600 font-bold text-xs">
                                {p.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs hover:text-cyan-400 transition">{p.name}</p>
                            <span className="font-mono text-[10px] text-slate-500">{p.sku}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-300 font-medium">{p.category?.name || 'Tanpa Kategori'}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                            p.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-bold text-emerald-400 font-mono">{formatIDR(minPrice)}</p>
                        <p className="text-[10px] text-slate-500">{p.variants.length} varian</p>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold text-xs ${
                              totalAvailableStock > 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {totalAvailableStock} item
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="flex items-center gap-1 p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold transition border border-slate-700"
                            title="Edit Produk & Gambar"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Edit</span>
                          </Link>
                          <Link
                            href={`/products/${p.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700"
                            title="Lihat di Toko"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
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
          totalPages={Math.ceil(filteredProducts.length / itemsPerPage) || 1}
          totalItems={filteredProducts.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
        />
      </div>

    </div>
  );
}
