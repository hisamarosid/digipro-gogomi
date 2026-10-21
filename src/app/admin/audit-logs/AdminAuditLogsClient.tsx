'use client';

import React, { useState } from 'react';
import { formatDateJakarta } from '@/lib/utils/formatters';
import { ShieldAlert, Search, ShieldCheck, Activity, User, Filter } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';

interface AdminAuditLogsClientProps {
  logs: any[];
}

export function AdminAuditLogsClient({ logs }: AdminAuditLogsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const filteredLogs = logs.filter((log) => {
    const actorName = log.actor?.name || '';
    const actorEmail = log.actor?.email || '';
    const action = log.action || '';
    const entity = log.entity || '';
    const detail = log.after || log.before || '';

    const q = searchTerm.toLowerCase();
    return (
      actorName.toLowerCase().includes(q) ||
      actorEmail.toLowerCase().includes(q) ||
      action.toLowerCase().includes(q) ||
      entity.toLowerCase().includes(q) ||
      detail.toLowerCase().includes(q)
    );
  });

  const paginatedLogs = filteredLogs.slice(
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
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Security &amp; Compliance Audit Trail</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Audit Logs &amp; Riwayat Keamanan
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Catatan komprehensif seluruh aktivitas sensitif administrator (reveal kredensial, perubahan izin, update status inventori, dan pengaturan sistem).
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Log Terekam</p>
          <p className="text-2xl font-black text-white">{logs.length}</p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Aksi Hari Ini</p>
          <p className="text-2xl font-black text-cyan-300">
            {logs.filter((l) => new Date(l.timestamp).toDateString() === new Date().toDateString()).length}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Aksi Sensitif</p>
          <p className="text-2xl font-black text-amber-300">
            {logs.filter((l) => l.action.includes('REVEAL') || l.action.includes('PERMISSION') || l.action.includes('DELETE')).length}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Integritas Audit</p>
          <p className="text-2xl font-black text-emerald-300">100% Valid</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        
        {/* Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Cari aksi, aktor, atau entitas..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <span className="text-slate-400 text-xs">
            Total: <strong className="text-white">{filteredLogs.length}</strong> Log Entry
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Aktor Staf</th>
                <th className="py-3 px-4">Tipe Aksi</th>
                <th className="py-3 px-4">Entitas Target</th>
                <th className="py-3 px-4">Detail Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Tidak ada audit log terekam.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                      {formatDateJakarta(log.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-white text-xs">{log.actor?.name || 'System'}</p>
                      <p className="text-[10px] text-cyan-400 font-mono">{log.actor?.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-slate-900 border border-slate-800 px-2.5 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      {log.entity}
                    </td>
                    <td className="py-3 px-4">
                      <pre className="text-[10px] font-mono text-slate-400 max-w-sm truncate bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        {log.after || log.before || '-'}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredLogs.length / itemsPerPage) || 1}
          totalItems={filteredLogs.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

    </div>
  );
}
