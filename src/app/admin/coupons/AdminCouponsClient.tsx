'use client';

import React, { useState, useEffect } from 'react';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import {
  Tag,
  Search,
  Plus,
  Percent,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  Gift,
  Calendar,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/Pagination';

interface AdminCouponsClientProps {
  coupons: any[];
  summary?: any;
}

export function AdminCouponsClient({ coupons: initialCoupons, summary: initialSummary }: AdminCouponsClientProps) {
  const [coupons, setCoupons] = useState<any[]>(initialCoupons);
  const [summary, setSummary] = useState<any>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [code, setCode] = useState('');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [value, setValue] = useState<number>(10);
  const [minimumPurchase, setMinimumPurchase] = useState<number>(0);
  const [maximumDiscount, setMaximumDiscount] = useState<string>('');
  const [usageLimit, setUsageLimit] = useState<string>('');
  const [usagePerUser, setUsagePerUser] = useState<number>(1);
  const [startsAt, setStartsAt] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [active, setActive] = useState<boolean>(true);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      let url = '/api/admin/coupons?';
      if (statusFilter !== 'ALL') url += `status=${statusFilter}&`;
      if (searchTerm.trim()) url += `q=${encodeURIComponent(searchTerm.trim())}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setCoupons(json.data.coupons);
        setSummary(json.data.summary);
      }
    } catch {
      toast.error('Gagal memuat data kupon promo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [statusFilter]);

  const handleOpenCreateModal = () => {
    setEditingCouponId(null);
    setCode('');
    setType('PERCENTAGE');
    setValue(10);
    setMinimumPurchase(0);
    setMaximumDiscount('');
    setUsageLimit('');
    setUsagePerUser(1);
    setStartsAt('');
    setExpiresAt('');
    setActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon: any) => {
    setEditingCouponId(coupon.id);
    setCode(coupon.code);
    setType(coupon.type);
    setValue(coupon.value);
    setMinimumPurchase(coupon.minimumPurchase || 0);
    setMaximumDiscount(coupon.maximumDiscount ? String(coupon.maximumDiscount) : '');
    setUsageLimit(coupon.usageLimit ? String(coupon.usageLimit) : '');
    setUsagePerUser(coupon.usagePerUser || 1);
    setStartsAt(coupon.startsAt ? new Date(coupon.startsAt).toISOString().slice(0, 16) : '');
    setExpiresAt(coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : '');
    setActive(coupon.active);
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Kode kupon wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        minimumPurchase: Number(minimumPurchase),
        maximumDiscount: maximumDiscount ? Number(maximumDiscount) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        usagePerUser: Number(usagePerUser),
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        active,
      };

      const url = editingCouponId ? `/api/admin/coupons/${editingCouponId}` : '/api/admin/coupons';
      const method = editingCouponId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(editingCouponId ? 'Kupon berhasil diperbarui!' : 'Kupon promo baru berhasil dibuat!');
        setIsModalOpen(false);
        fetchCoupons();
      } else {
        toast.error(`Gagal: ${json.error}`);
      }
    } catch {
      toast.error('Gagal menyimpan kupon');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleActiveOnly: true }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Status kupon berhasil diperbarui!');
        fetchCoupons();
      } else {
        toast.error(`Gagal: ${json.error}`);
      }
    } catch {
      toast.error('Gagal mengubah status kupon');
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kupon ${code}?`)) return;

    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success(`Kupon ${code} berhasil dihapus/dinonaktifkan`);
        fetchCoupons();
      } else {
        toast.error(`Gagal: ${json.error}`);
      }
    } catch {
      toast.error('Gagal menghapus kupon');
    }
  };

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const paginatedCoupons = filteredCoupons.slice(
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
              <Tag className="h-3.5 w-3.5" />
              <span>Discount &amp; Promotion Center</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Kupon Diskon &amp; Promo Toko
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Pengaturan voucher promo potongan harga produk digital, kuota limit penggunaan, margin protection, dan periode diskon.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Kupon Baru</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-1">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Kupon</p>
            <p className="text-2xl font-black text-white">{summary.totalCount}</p>
          </div>

          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-1">
            <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Kupon Aktif</p>
            <p className="text-2xl font-black text-emerald-300">{summary.activeCount}</p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-1">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Kupon Nonaktif</p>
            <p className="text-2xl font-black text-slate-400">{summary.inactiveCount}</p>
          </div>

          <div className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 space-y-1">
            <p className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider">Total Diskon Diberikan</p>
            <p className="text-2xl font-black font-mono text-cyan-300">{formatIDR(summary.totalDiscountGiven)}</p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs">
          {[
            { id: 'ALL', label: 'Semua Kupon' },
            { id: 'ACTIVE', label: 'Aktif' },
            { id: 'INACTIVE', label: 'Nonaktif' },
            { id: 'EXPIRED', label: 'Expired' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setStatusFilter(t.id)}
              className={`px-3.5 py-2 rounded-xl font-bold transition ${
                statusFilter === t.id
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari kode kupon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Grid List */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-6">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <div className="animate-spin h-6 w-6 border-2 border-rose-400 border-t-transparent rounded-full mx-auto mb-2" />
            Memuat daftar kupon promo...
          </div>
        ) : filteredCoupons.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">Tidak ada kupon promo yang sesuai.</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedCoupons.map((coupon) => {
                const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                return (
                  <div
                    key={coupon.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4 hover:border-slate-700 transition relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-xl tracking-wider">
                        {coupon.code}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(coupon.id)}
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full transition border ${
                          coupon.active && !isExpired
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {coupon.active && !isExpired ? (
                          <>
                            <CheckCircle className="h-3 w-3" /> AKTIF
                          </>
                        ) : isExpired ? (
                          <>
                            <Clock className="h-3 w-3 text-amber-400" /> EXPIRED
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" /> NONAKTIF
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Potongan Diskon:</p>
                      <p className="text-xl font-black text-white">
                        {coupon.type === 'PERCENTAGE'
                          ? `${coupon.value}% OFF`
                          : formatIDR(coupon.value)}
                      </p>

                      {coupon.type === 'PERCENTAGE' && coupon.maximumDiscount ? (
                        <p className="text-[11px] text-cyan-300">Maks. Diskon: {formatIDR(coupon.maximumDiscount)}</p>
                      ) : null}

                      {coupon.minimumPurchase > 0 && (
                        <p className="text-[11px] text-slate-400">
                          Min. Belanja: <span className="text-white font-medium">{formatIDR(coupon.minimumPurchase)}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 space-y-1 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Penggunaan:</span>
                        <span className="font-mono font-bold text-white">
                          {coupon.usedCount} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : 'kali'}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span>Batas Per User:</span>
                        <span className="font-mono font-bold text-slate-300">{coupon.usagePerUser || 1}x</span>
                      </div>

                      {coupon.expiresAt && (
                        <div className="flex justify-between text-[11px] pt-1">
                          <span>Kedaluwarsa:</span>
                          <span className="text-amber-300 font-medium">{formatDateJakarta(coupon.expiresAt)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(coupon)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                        className="py-1.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs transition flex items-center justify-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredCoupons.length / itemsPerPage)}
              totalItems={filteredCoupons.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Modal Create / Edit Coupon */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <form onSubmit={handleSaveCoupon} className="w-full max-w-lg rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Tag className="h-5 w-5 text-rose-400" />
              <span>{editingCouponId ? 'Edit Kupon Promo' : 'Buat Kupon Promo Baru'}</span>
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Kode Kupon Promo *</label>
              <input
                type="text"
                required
                placeholder="Contoh: DISKON50 / HEMAT10K"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-rose-400 font-mono font-bold text-sm focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Tipe Potongan *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 focus:outline-none"
                >
                  <option value="PERCENTAGE">Persentase (%)</option>
                  <option value="FIXED">Nominal Tetap (Rp)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">
                  {type === 'PERCENTAGE' ? 'Nilai Persentase (%) *' : 'Nominal Diskon (Rp) *'}
                </label>
                <input
                  type="number"
                  required
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Min. Pembelian (Rp)</label>
                <input
                  type="number"
                  value={minimumPurchase}
                  onChange={(e) => setMinimumPurchase(Number(e.target.value))}
                  placeholder="0 (Tanpa minimal)"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-rose-500 focus:outline-none"
                />
              </div>

              {type === 'PERCENTAGE' ? (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Maks. Potongan Diskon (Rp)</label>
                  <input
                    type="number"
                    value={maximumDiscount}
                    onChange={(e) => setMaximumDiscount(e.target.value)}
                    placeholder="Opsional (Tanpa batas)"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-rose-500 focus:outline-none"
                  />
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Batas Penggunaan Global</label>
                <input
                  type="number"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="Opsional (Tak terbatas)"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Batas Per User (Default: 1)</label>
                <input
                  type="number"
                  value={usagePerUser}
                  onChange={(e) => setUsagePerUser(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Tanggal Mulai (Opsional)</label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Tanggal Expiry (Opsional)</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="activeSwitch"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded accent-rose-500"
              />
              <label htmlFor="activeSwitch" className="text-xs text-white font-bold cursor-pointer">
                Aktifkan kupon ini sekarang
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold flex items-center gap-2"
              >
                {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                <span>{editingCouponId ? 'Simpan Perubahan' : 'Buat Kupon'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
