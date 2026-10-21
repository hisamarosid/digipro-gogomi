'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatDateJakarta, formatIDR } from '@/lib/utils/formatters';
import {
  Users,
  Search,
  Shield,
  ShoppingBag,
  Star,
  Mail,
  Crown,
  DollarSign,
  RefreshCw,
  LifeBuoy,
  Eye,
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/Pagination';

interface AdminCustomersClientProps {
  customers: any[];
}

export function AdminCustomersClient({ customers: initialCustomers }: AdminCustomersClientProps) {
  const [customers, setCustomers] = useState<any[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const getCustomerTier = (spent: number) => {
    if (spent >= 1500000) return { label: 'PLATINUM VIP', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
    if (spent >= 500000) return { label: 'GOLD', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    if (spent >= 100000) return { label: 'SILVER', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    return { label: 'BRONZE', color: 'bg-slate-800 text-slate-400 border-slate-700' };
  };

  // Metrics calculation
  const totalCustomers = customers.length;
  const vipCount = customers.filter((c) => (c.totalSpent || 0) >= 500000).length;
  const platinumCount = customers.filter((c) => (c.totalSpent || 0) >= 1500000).length;
  const totalActiveSubs = customers.reduce((sum, c) => sum + (c.activeSubCount || 0), 0);
  const totalLTV = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.id || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || c.role === roleFilter;

    let matchesTier = true;
    const spent = c.totalSpent || 0;
    if (tierFilter === 'VIP') matchesTier = spent >= 500000;
    else if (tierFilter === 'PLATINUM') matchesTier = spent >= 1500000;
    else if (tierFilter === 'BRONZE') matchesTier = spent < 100000;

    return matchesSearch && matchesRole && matchesTier;
  });

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setIsUpdatingRole(true);
    try {
      const res = await fetch(`/api/admin/customers/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Role pengguna berhasil diubah menjadi ${newRole}!`);

        setCustomers((prev) =>
          prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user))
        );

        if (selectedCustomer?.id === userId) {
          setSelectedCustomer((prev: any) => ({ ...prev, role: newRole }));
        }
      } else {
        toast.error(json.error || 'Gagal mengubah role pengguna');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const paginatedCustomers = filteredCustomers.slice(
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
              <Users className="h-3.5 w-3.5" />
              <span>Customer Relationship &amp; VIP Loyalty</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Pelanggan
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Daftar seluruh pelanggan terdaftar, riwayat akumulasi transaksi LTV, status langganan aktif, serta matriks tier membership.
            </p>
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Pelanggan</p>
          <p className="text-2xl font-black text-white">{totalCustomers}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Member VIP &amp; Gold</p>
          <p className="text-2xl font-black text-amber-300">{vipCount}</p>
        </div>
        <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Platinum VIP</p>
          <p className="text-2xl font-black text-purple-300">{platinumCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Total LTV Akumulasi</p>
          <p className="text-2xl font-black text-emerald-300 font-mono">{formatIDR(totalLTV)}</p>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 glass-panel p-4 rounded-3xl border border-slate-800 bg-slate-900/60">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari nama, email, nomor hp..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Semua Role</option>
            <option value="CUSTOMER">CUSTOMER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Semua Tier Belanja</option>
            <option value="VIP">VIP & Gold (&ge; Rp 500rb)</option>
            <option value="PLATINUM">Platinum VIP (&ge; Rp 1.5jt)</option>
            <option value="BRONZE">Bronze (&lt; Rp 100rb)</option>
          </select>
        </div>
      </div>

      {/* CUSTOMERS TABLE */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        {filteredCustomers.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">Tidak ada pelanggan ditemukan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-3">Nama & Email Pelanggan</th>
                  <th className="py-3 px-3">Tier VIP & Role</th>
                  <th className="py-3 px-3">Total Belanja (LTV)</th>
                  <th className="py-3 px-3">Total Order</th>
                  <th className="py-3 px-3">Langganan Aktif</th>
                  <th className="py-3 px-3">Terdaftar Pada</th>
                  <th className="py-3 px-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedCustomers.map((user) => {
                  const tier = getCustomerTier(user.totalSpent || 0);

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition">

                      {/* Name & Email */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-cyan-400 font-bold flex items-center justify-center text-xs shrink-0">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-white line-clamp-1">{user.name}</p>
                            <p className="text-[10px] text-blue-600 dark:text-cyan-400 font-mono">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Tier & Role */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-extrabold uppercase border ${tier.color}`}>
                            {tier.label}
                          </span>
                          <span className="block text-[10px] font-mono text-slate-400">
                            Role: <strong className="text-white">{user.role}</strong>
                          </span>
                        </div>
                      </td>

                      {/* LTV Total Spent */}
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        {formatIDR(user.totalSpent || 0)}
                      </td>

                      {/* Total Orders */}
                      <td className="py-3 px-3">
                        <Link
                          href={`/admin/orders?search=${user.email}`}
                          className="font-mono font-bold text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <ShoppingBag className="h-3 w-3 text-blue-600 dark:text-cyan-400" />
                          <span>{user._count?.orders || 0} Order</span>
                        </Link>
                      </td>

                      {/* Active Subscriptions */}
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {user.activeSubCount || 0} Aktif
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-3 text-[11px] text-slate-400">
                        {formatDateJakarta(user.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSelectedCustomer(user)}
                          className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
                          title="Lihat Detail Profil"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredCustomers.length / itemsPerPage)}
          totalItems={filteredCustomers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* RICH CUSTOMER DETAIL MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-cyan-400 font-bold flex items-center justify-center text-sm shrink-0">
                  {selectedCustomer.name ? selectedCustomer.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">{selectedCustomer.name}</h3>
                  <p className="text-[11px] text-cyan-400 font-mono">{selectedCustomer.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Belanja (LTV)</span>
                <span className="text-base font-black text-emerald-400">{formatIDR(selectedCustomer.totalSpent || 0)}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Orders</span>
                <span className="text-base font-black text-white">{selectedCustomer._count?.orders || 0} Order</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Langganan Digital</span>
                <span className="text-base font-black text-amber-400">{selectedCustomer._count?.subscriptions || 0}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Tiket Support & Garansi</span>
                <span className="text-base font-black text-cyan-400">{selectedCustomer._count?.tickets || 0} Tiket</span>
              </div>
            </div>

            {/* Recent Orders History */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-cyan-400 uppercase font-extrabold flex items-center gap-1">
                  <ShoppingBag className="h-3.5 w-3.5" /> Riwayat Transaksi Pesanan Terakhir
                </span>
                <Link
                  href={`/admin/orders?search=${selectedCustomer.email}`}
                  target="_blank"
                  className="text-[11px] text-cyan-400 font-bold hover:underline flex items-center gap-1"
                >
                  <span>Lihat Semua Di Admin Orders →</span>
                </Link>
              </div>

              {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
                  {selectedCustomer.orders.map((ord: any) => (
                    <div key={ord.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-white">{ord.orderNumber}</span>
                        <span className="text-[10px] text-slate-400 block">{formatDateJakarta(ord.createdAt)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-400 block">{formatIDR(ord.grandTotal)}</span>
                        <span className="text-[9px] uppercase font-bold text-cyan-400">{ord.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Belum ada transaksi pesanan.</p>
              )}
            </div>

            {/* Customer Subscriptions List */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <span className="text-[10px] text-amber-400 uppercase font-extrabold flex items-center gap-1">
                <RefreshCw className="h-3.5 w-3.5" /> Daftar Langganan Digital Aktif
              </span>

              {selectedCustomer.subscriptions && selectedCustomer.subscriptions.length > 0 ? (
                <div className="space-y-2 pt-1 max-h-36 overflow-y-auto">
                  {selectedCustomer.subscriptions.map((sub: any) => (
                    <div key={sub.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{sub.variant?.product?.name}</p>
                        <p className="text-[10px] text-cyan-400 font-mono">{sub.variant?.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-amber-400 block">Berakhir: {formatDateJakarta(sub.expiresAt)}</span>
                        <span className="text-[9px] uppercase font-bold text-emerald-400">{sub.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Belum ada langganan digital aktif.</p>
              )}
            </div>

            {/* Admin Role Control */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <span className="text-[10px] text-cyan-400 uppercase font-extrabold block">KONTROL PERAN PENGGUNA (ROLE)</span>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-slate-300 font-bold block">Role Saat Ini: <strong className="text-amber-400">{selectedCustomer.role}</strong></span>
                  <span className="text-[10px] text-slate-500">Ubah hak akses pengguna ini di platform.</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedCustomer.role}
                    disabled={isUpdatingRole}
                    onChange={(e) => handleUpdateRole(selectedCustomer.id, e.target.value)}
                    className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs font-bold text-white focus:border-cyan-500"
                  >
                    <option value="CUSTOMER">CUSTOMER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCustomer(null)}
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
