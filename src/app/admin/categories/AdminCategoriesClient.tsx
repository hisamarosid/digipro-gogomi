'use client';

import React, { useState } from 'react';
import {
  FolderTree,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  X,
  Layers,
  Sparkles,
  Palette,
  CheckSquare,
  Code,
  GraduationCap,
  Package,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Pagination } from '@/components/ui/Pagination';

interface AdminCategoriesClientProps {
  categories: any[];
}

export function AdminCategoriesClient({ categories: initialCategories }: AdminCategoriesClientProps) {
  const [categories, setCategories] = useState<any[]>(initialCategories);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Sparkles');
  const [sortOrder, setSortOrder] = useState('1');
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCategoriesCount = categories.length;
  const activeCategoriesCount = categories.filter((c) => c.active).length;
  const inactiveCategoriesCount = categories.filter((c) => !c.active).length;

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setIcon('Sparkles');
    setSortOrder(String((categories.length + 1) * 10));
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setSlug(cat.slug || '');
    setDescription(cat.description || '');
    setIcon(cat.icon || 'Sparkles');
    setSortOrder(String(cat.sortOrder || 1));
    setActive(Boolean(cat.active));
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setSlug(generatedSlug);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error('Nama dan Slug kategori wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          icon,
          sortOrder: parseInt(sortOrder) || 1,
          active,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(
          editingCategory
            ? 'Kategori berhasil diperbarui'
            : 'Kategori baru berhasil ditambahkan'
        );
        setIsModalOpen(false);

        // Refresh categories
        const refRes = await fetch('/api/admin/categories');
        const refJson = await refRes.json();
        if (refJson.success) {
          setCategories(refJson.data || []);
        }
      } else {
        toast.error(json.error || 'Gagal menyimpan kategori');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/categories/${deleteId}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message || 'Kategori berhasil dihapus');
        setDeleteId(null);

        // Refresh categories
        const refRes = await fetch('/api/admin/categories');
        const refJson = await refRes.json();
        if (refJson.success) {
          setCategories(refJson.data || []);
        }
      } else {
        toast.error(json.error || 'Gagal menghapus kategori');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Palette':
        return <Palette className="h-4 w-4 text-cyan-400" />;
      case 'CheckSquare':
        return <CheckSquare className="h-4 w-4 text-blue-400" />;
      case 'Code':
        return <Code className="h-4 w-4 text-cyan-400" />;
      case 'GraduationCap':
        return <GraduationCap className="h-4 w-4 text-blue-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-cyan-400" />;
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <FolderTree className="h-3.5 w-3.5" />
              <span>Taxonomy &amp; Organization</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Kategori Produk
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Kelola pengelompokan katalog produk digital, urutan tampilan navigasi toko, serta visibilitas kategori.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Kategori Baru</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Kategori</p>
          <p className="text-2xl font-black text-white">{totalCategoriesCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Kategori Aktif</p>
          <p className="text-2xl font-black text-emerald-300">{activeCategoriesCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Kategori Inaktif</p>
          <p className="text-2xl font-black text-amber-300">{inactiveCategoriesCount}</p>
        </div>
      </div>

      {/* Categories Card */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Cari nama atau slug kategori..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <span className="text-slate-400 text-xs">
            Total: <strong className="text-white">{filteredCategories.length}</strong> Kategori
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Slug URL</th>
                <th className="py-3 px-4">Total Produk</th>
                <th className="py-3 px-4">Urutan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedCategories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Tidak ada kategori ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedCategories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition text-xs">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800">
                          <CategoryIcon name={c.icon} className="h-4 w-4 text-cyan-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{c.name}</p>
                          {c.description && (
                            <p className="text-[11px] text-slate-500 max-w-xs truncate">{c.description}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <code className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-cyan-400 border border-slate-800">
                        {c.slug}
                      </code>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-white">{c._count?.products || 0}</span>
                      <span className="text-slate-500 text-[11px]"> produk</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-400 font-bold">{c.sortOrder}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                          c.active
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {c.active ? 'AKTIF' : 'INAKTIF'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          className="flex items-center gap-1 p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold transition border border-slate-700"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteId(c.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition border border-slate-700 hover:border-rose-500/30"
                          title="Hapus Kategori"
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
          totalPages={Math.ceil(filteredCategories.length / itemsPerPage) || 1}
          totalItems={filteredCategories.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* MODAL: ADD / EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-base">
                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Nama Kategori *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Contoh: AI & ChatGPT"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Slug URL *</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="ai-chatgpt"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Akun AI produktivitas..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block flex items-center justify-between">
                  <span>Nama Icon (Lucide / Emoji)</span>
                  <div className="flex items-center gap-1 text-[11px] text-cyan-400">
                    <span>Preview:</span>
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-900 border border-slate-800">
                      <CategoryIcon name={icon} className="h-3.5 w-3.5 text-cyan-400" />
                    </div>
                  </div>
                </label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="Contoh: Palette, Bot, Code, Film, Share2, Sparkles"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Palette', 'Bot', 'Code', 'Film', 'Share2', 'Sparkles', 'Tv', 'Music', 'Globe', 'Users'].map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition ${
                        icon === ic
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <CategoryIcon name={ic} className="h-3 w-3" />
                      <span>{ic}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Urutan Tampil (Sort)</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold block">Status Aktif</label>
                  <select
                    value={active ? 'true' : 'false'}
                    onChange={(e) => setActive(e.target.value === 'true')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Inaktif</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold transition text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition text-xs flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>Simpan Kategori</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="font-extrabold text-white text-base">Hapus Kategori?</h3>
            <p className="text-xs text-slate-400">
              Tindakan ini tidak dapat dibatalkan. Pastikan tidak ada produk yang masih menggunakan kategori ini.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
