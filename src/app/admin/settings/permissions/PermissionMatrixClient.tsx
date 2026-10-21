'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Shield,
  Lock,
  CheckCircle2,
  XCircle,
  Sliders,
  Search,
  Filter,
  Users,
  Info,
  ExternalLink,
  Key,
} from 'lucide-react';
import {
  PERMISSION_GROUPS,
  DEFAULT_ADMIN_PERMISSIONS,
  ALL_PERMISSIONS,
  PermissionCode,
} from '@/lib/auth/permissions';

export function PermissionMatrixClient() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL'); // ALL, SENSITIVE, OPERATIONAL

  const totalPerms = ALL_PERMISSIONS.length;
  const defaultAdminCount = DEFAULT_ADMIN_PERMISSIONS.size;
  const sensitiveCount = PERMISSION_GROUPS.flatMap((g) => g.permissions.filter((p) => p.isSensitive)).length;

  const filteredGroups = PERMISSION_GROUPS.filter((group) => {
    if (selectedGroupId !== 'ALL' && group.id !== selectedGroupId) {
      return false;
    }
    return true;
  }).map((group) => {
    const filteredPerms = group.permissions.filter((perm) => {
      const matchesSearch =
        perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        filterType === 'ALL' ||
        (filterType === 'SENSITIVE' && perm.isSensitive) ||
        (filterType === 'OPERATIONAL' && !perm.isSensitive);

      return matchesSearch && matchesType;
    });

    return {
      ...group,
      permissions: filteredPerms,
    };
  }).filter((group) => group.permissions.length > 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Sliders className="h-3.5 w-3.5" />
              <span>RBAC Governance System</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Matriks Izin &amp; Hak Akses Role
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Daftar seluruh granular permissions sistem DigiPro Store yang dikelompokkan berdasarkan modul operasional, keamanan, dan keuangan.
            </p>
          </div>

          <Link
            href="/admin/system/admins"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition shrink-0"
          >
            <Users className="h-4 w-4" />
            <span>Kelola Staf Admin</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Granular Permissions</p>
          <p className="text-2xl font-black text-white">{totalPerms}</p>
        </div>
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Super Admin Access</p>
          <p className="text-2xl font-black text-cyan-300">100% (Bypass All)</p>
        </div>
        <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Default Admin Operasional</p>
          <p className="text-2xl font-black text-blue-300">{defaultAdminCount}</p>
        </div>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Izin Sensitif / Eksplisit</p>
          <p className="text-2xl font-black text-rose-300">{sensitiveCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Cari izin, nama, atau kode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            </div>

            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="rounded-2xl bg-slate-950 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Semua Kategori</option>
              {PERMISSION_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-2xl bg-slate-950 border border-slate-800 py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Semua Tingkatan</option>
              <option value="OPERATIONAL">Operasional Standar Saja</option>
              <option value="SENSITIVE">Izin Sensitif Saja</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" /> SUPER_ADMIN
            </span>
            <span className="inline-flex items-center gap-1 ml-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-400" /> ADMIN (Default)
            </span>
            <span className="inline-flex items-center gap-1 ml-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> ADMIN (Eksplisit)
            </span>
          </div>
        </div>

        {/* Matrix Group Cards */}
        <div className="space-y-6">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Tidak ada permission yang sesuai dengan kriteria pencarian.
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Key className="h-4 w-4 text-cyan-400" />
                      <span>{group.name}</span>
                    </h3>
                    <p className="text-xs text-slate-400">{group.description}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {group.permissions.length} Izin
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500 font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Nama Permission</th>
                        <th className="py-2.5 px-3">Kode Identifier</th>
                        <th className="py-2.5 px-3">Deskripsi &amp; Cakupan</th>
                        <th className="py-2.5 px-3 text-center">SUPER_ADMIN</th>
                        <th className="py-2.5 px-3 text-center">ADMIN (Bawaan)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {group.permissions.map((perm) => {
                        const isDefaultAdmin = DEFAULT_ADMIN_PERMISSIONS.has(perm.code);

                        return (
                          <tr key={perm.code} className="hover:bg-slate-900/40 transition">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{perm.name}</span>
                                {perm.isSensitive && (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold">
                                    Sensitif
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-cyan-400">
                              {perm.code}
                            </td>
                            <td className="py-3 px-3 text-slate-400 text-xs leading-relaxed max-w-xs">
                              {perm.description}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Penuh</span>
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {isDefaultAdmin ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/30">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Tersedia</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                                  <Lock className="h-3.5 w-3.5" />
                                  <span>Perlu Izin Khusus</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
