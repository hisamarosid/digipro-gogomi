'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Shield,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Key,
  Edit2,
  Lock,
  X,
  AlertTriangle,
  Sliders,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateJakarta } from '@/lib/utils/formatters';
import { PERMISSION_GROUPS, ALL_PERMISSIONS, PermissionCode } from '@/lib/auth/permissions';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  customPermissions: PermissionCode[];
  effectivePermissions: PermissionCode[];
  isSuperAdmin: boolean;
}

interface AdminManagementClientProps {
  initialAdmins: AdminUser[];
  currentUserId: string;
}

export function AdminManagementClient({ initialAdmins, currentUserId }: AdminManagementClientProps) {
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('ADMIN');
  const [createPermissions, setCreatePermissions] = useState<PermissionCode[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Edit Modal
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Permissions Modal
  const [permAdmin, setPermAdmin] = useState<AdminUser | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<PermissionCode[]>([]);
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  // Stats
  const totalCount = admins.length;
  const superAdminCount = admins.filter((a) => a.role === 'SUPER_ADMIN' && !a.disabled).length;
  const regularAdminCount = admins.filter((a) => a.role !== 'SUPER_ADMIN' && !a.disabled).length;
  const disabledCount = admins.filter((a) => a.disabled).length;

  const refreshAdmins = async () => {
    try {
      const res = await fetch('/api/admin/system/admins');
      const json = await res.json();
      if (json.success) {
        setAdmins(json.data);
      }
    } catch {
      toast.error('Gagal memuat ulang daftar admin');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName || !createEmail || !createPassword) {
      toast.error('Semua kolom wajib diisi');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/admin/system/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          password: createPassword,
          role: createRole,
          customPermissions: createRole === 'SUPER_ADMIN' ? [] : createPermissions,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Gagal membuat admin');
        return;
      }

      toast.success(`Admin "${createName}" berhasil dibuat!`);
      setIsCreateModalOpen(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreateRole('ADMIN');
      setCreatePermissions([]);
      await refreshAdmins();
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat admin');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAdmin) return;

    setIsSavingEdit(true);
    try {
      const body: any = {
        name: editName,
        email: editEmail,
        role: editRole,
      };
      if (editPassword.trim()) {
        body.password = editPassword.trim();
      }

      const res = await fetch(`/api/admin/system/admins/${editAdmin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Gagal mengubah data admin');
        return;
      }

      toast.success(`Admin "${editName}" berhasil diperbarui!`);
      setEditAdmin(null);
      await refreshAdmins();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah data admin');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleDisable = async (admin: AdminUser) => {
    const actionText = admin.disabled ? 'mengaktifkan' : 'menonaktifkan';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} akun "${admin.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/system/admins/${admin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: !admin.disabled }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || `Gagal ${actionText} admin`);
        return;
      }

      toast.success(`Akun "${admin.name}" berhasil ${admin.disabled ? 'diaktifkan kembali' : 'dinonaktifkan'}.`);
      await refreshAdmins();
    } catch (err: any) {
      toast.error(err.message || `Gagal ${actionText} admin`);
    }
  };

  const openPermissionsModal = (admin: AdminUser) => {
    setPermAdmin(admin);
    setSelectedPerms([...admin.customPermissions]);
  };

  const handleSavePermissions = async () => {
    if (!permAdmin) return;

    setIsSavingPerms(true);
    try {
      const res = await fetch(`/api/admin/system/admins/${permAdmin.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: selectedPerms }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Gagal menyimpan permissions');
        return;
      }

      toast.success(`Permissions untuk "${permAdmin.name}" berhasil diperbarui!`);
      setPermAdmin(null);
      await refreshAdmins();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan permissions');
    } finally {
      setIsSavingPerms(false);
    }
  };

  const togglePermission = (code: PermissionCode) => {
    if (selectedPerms.includes(code)) {
      setSelectedPerms(selectedPerms.filter((p) => p !== code));
    } else {
      setSelectedPerms([...selectedPerms, code]);
    }
  };

  const toggleGroupAll = (groupPermCodes: PermissionCode[]) => {
    const allSelected = groupPermCodes.every((p) => selectedPerms.includes(p));
    if (allSelected) {
      setSelectedPerms(selectedPerms.filter((p) => !groupPermCodes.includes(p)));
    } else {
      const merged = new Set([...selectedPerms, ...groupPermCodes]);
      setSelectedPerms(Array.from(merged));
    }
  };

  const filteredAdmins = admins.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || a.role === roleFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && !a.disabled) ||
      (statusFilter === 'DISABLED' && a.disabled);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Super Admin Control Center</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Administrator &amp; Hak Akses
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Kelola akun staf administrator, tetapkan role, dan atur matriks izin granular (*Granular Permissions*) secara terpusat dan aman.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tambah Admin Baru</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Admin</p>
          <p className="text-2xl font-black text-white">{totalCount}</p>
        </div>
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Super Admins</p>
          <p className="text-2xl font-black text-cyan-300">{superAdminCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Regular Admins</p>
          <p className="text-2xl font-black text-blue-400">{regularAdminCount}</p>
        </div>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Dinonaktifkan</p>
          <p className="text-2xl font-black text-rose-300">{disabledCount}</p>
        </div>
      </div>

      {/* Admin List Card */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-2xl bg-slate-950 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Semua Role</option>
              <option value="SUPER_ADMIN">SUPER ADMIN</option>
              <option value="ADMIN">ADMIN</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-2xl bg-slate-950 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif Saja</option>
              <option value="DISABLED">Dinonaktifkan</option>
            </select>
          </div>

          <button
            type="button"
            onClick={refreshAdmins}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition self-end"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Muat Ulang</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500 font-bold">
              <tr>
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status Akun</th>
                <th className="py-3 px-4">Custom Permissions</th>
                <th className="py-3 px-4">Dibuat Pada</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans text-xs">
                    Tidak ada akun administrator yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const isCurrent = admin.id === currentUserId;
                  return (
                    <tr key={admin.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase">
                            {admin.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white flex items-center gap-1.5">
                              <span>{admin.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                  Anda
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            admin.role === 'SUPER_ADMIN'
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          }`}
                        >
                          <Shield className="h-3 w-3" />
                          <span>{admin.role}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            !admin.disabled
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}
                        >
                          {!admin.disabled ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              <span>Dinonaktifkan</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {admin.isSuperAdmin ? (
                          <span className="text-[11px] text-cyan-400 font-bold italic">
                            Full Access (Bypass)
                          </span>
                        ) : admin.customPermissions.length > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold">
                            +{admin.customPermissions.length} Izin Eksplisit
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Default Operasional</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {formatDateJakarta(admin.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {!admin.isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => openPermissionsModal(admin)}
                              className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-bold transition flex items-center gap-1"
                              title="Kelola Permissions"
                            >
                              <Sliders className="h-3 w-3" />
                              <span>Permissions</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setEditAdmin(admin);
                              setEditName(admin.name);
                              setEditEmail(admin.email);
                              setEditRole(admin.role);
                              setEditPassword('');
                            }}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Edit Data Admin"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleDisable(admin)}
                            className={`p-1.5 rounded-xl border transition ${
                              admin.disabled
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                            }`}
                            title={admin.disabled ? 'Aktifkan Akun' : 'Nonaktifkan Akun'}
                          >
                            {!admin.disabled ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
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
      </div>

      {/* CREATE ADMIN MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <UserPlus className="h-4 w-4 text-blue-500" />
                <span>Buat Akun Administrator Baru</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-300">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Andi Pratama"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-300">Alamat Email *</label>
                <input
                  type="email"
                  required
                  placeholder="admin.staff@gogomi.store"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-300">Password Awal (Min. 8 Karakter) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3 text-white focus:outline-none focus:border-cyan-500 text-xs font-mono"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-300">Role Tingkatan *</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3 text-white focus:outline-none focus:border-cyan-500 text-xs font-bold"
                >
                  <option value="ADMIN">ADMIN (Operasional Standar Toko)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Akses Penuh &amp; Kontrol Sistem)</option>
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-bold text-slate-200">ℹ️ Kebijakan Hak Akses Awal:</p>
                <p>
                  Akun <b>ADMIN</b> otomatis mendapatkan akses operasional standar. Izin sensitif (seperti reveal password, override fulfillment, dan financial reports) dapat diberikan di menu <b>Permissions</b> setelah akun dibuat.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-300 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition disabled:opacity-50"
                >
                  {isCreating ? 'Menyimpan...' : 'Buat Akun Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {editAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Edit2 className="h-4 w-4 text-cyan-400" />
                <span>Edit Administrator: {editAdmin.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditAdmin(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-300">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-300">Alamat Email *</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-300">Role Tingkatan</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3 text-white focus:outline-none focus:border-cyan-500 text-xs font-bold"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-300">Ganti Password (Kosongkan jika tidak diubah)</label>
                <input
                  type="password"
                  placeholder="Masukkan password baru jika ingin mengubah"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3 text-white focus:outline-none focus:border-cyan-500 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditAdmin(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-300 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition disabled:opacity-50"
                >
                  {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE PERMISSIONS MODAL */}
      {permAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Sliders className="h-4 w-4 text-cyan-400" />
                <span>Atur Permissions: {permAdmin.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">
                  {permAdmin.role}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPermAdmin(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs text-slate-400 shrink-0">
              Centang izin khusus di bawah untuk memberikan akses eksplisit kepada administrator ini di luar izin bawaan role:
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 no-scrollbar text-xs">
              {PERMISSION_GROUPS.map((group) => {
                const groupCodes = group.permissions.map((p) => p.code);
                const allSelected = groupCodes.every((c) => selectedPerms.includes(c));

                return (
                  <div key={group.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm">{group.name}</h4>
                        <p className="text-[11px] text-slate-400">{group.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleGroupAll(groupCodes)}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition"
                      >
                        {allSelected ? 'Unselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                      {group.permissions.map((perm) => {
                        const isChecked = selectedPerms.includes(perm.code);

                        return (
                          <label
                            key={perm.code}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                              isChecked
                                ? 'bg-cyan-950/30 border-cyan-500/40 text-white'
                                : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.code)}
                              className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0"
                            />
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-200">{perm.name}</span>
                                {perm.isSensitive && (
                                  <span className="px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold">
                                    Sensitif
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 leading-snug">{perm.description}</p>
                              <p className="text-[9px] font-mono text-slate-400">{perm.code}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
              <span className="text-[11px] text-slate-400 font-mono">
                Terpilih: <b className="text-cyan-400">{selectedPerms.length}</b> izin khusus
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPermAdmin(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-300 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={isSavingPerms}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition disabled:opacity-50"
                >
                  {isSavingPerms ? 'Menyimpan...' : 'Simpan Permissions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
