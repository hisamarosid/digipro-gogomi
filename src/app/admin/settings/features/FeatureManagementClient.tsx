'use client';

import React, { useState } from 'react';
import {
  Sliders,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  History,
  Zap,
  Info,
  Lock,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { FEATURE_FLAGS_CONFIG, FeatureKey, FeatureFlagMeta } from '@/config/featureFlags.config';
import { formatDateJakarta } from '@/lib/utils/formatters';
import { Pagination } from '@/components/ui/Pagination';

interface FeatureManagementClientProps {
  initialFlags: Record<FeatureKey, boolean>;
  initialAuditLogs: any[];
}

export function FeatureManagementClient({ initialFlags, initialAuditLogs }: FeatureManagementClientProps) {
  const [flags, setFlags] = useState<Record<FeatureKey, boolean>>(initialFlags);
  const [auditLogs, setAuditLogs] = useState<any[]>(initialAuditLogs);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  // Pagination state for Audit Logs
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Warning Modal State
  const [pendingDisableKey, setPendingDisableKey] = useState<FeatureKey | null>(null);

  const handleToggleClick = (meta: FeatureFlagMeta) => {
    const currentState = flags[meta.key];
    const nextState = !currentState;

    if (!nextState && meta.activeWarningMessage) {
      setPendingDisableKey(meta.key);
      return;
    }

    executeToggle(meta.key, nextState);
  };

  const executeToggle = async (key: FeatureKey, nextState: boolean) => {
    setUpdatingKey(key);
    try {
      const res = await fetch('/api/admin/settings/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureKey: key, enabled: nextState }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFlags(json.data);
        toast.success(json.message || `Status fitur ${key} berhasil diperbarui`);
        fetchLatestData();
      } else {
        toast.error(json.error || 'Gagal mengedit status fitur');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setUpdatingKey(null);
      setPendingDisableKey(null);
    }
  };

  const fetchLatestData = async () => {
    try {
      const res = await fetch('/api/admin/settings/features');
      const json = await res.json();
      if (res.ok && json.success) {
        setFlags(json.data.flags);
        setAuditLogs(json.data.auditLogs);
      }
    } catch {}
  };

  const coreFeatures = Object.values(FEATURE_FLAGS_CONFIG).filter((f) => f.category === 'CORE');
  const optionalFeatures = Object.values(FEATURE_FLAGS_CONFIG).filter((f) => f.category === 'OPTIONAL');

  // Audit Logs Pagination
  const totalAuditItems = auditLogs.length;
  const totalAuditPages = Math.ceil(totalAuditItems / itemsPerPage) || 1;
  const paginatedAuditLogs = auditLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-xs">
      
      {/* Header Banner Box Card (Exact match with Inventory screenshot header box) */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-extrabold uppercase tracking-wider">
              <Sliders className="h-3.5 w-3.5" />
              <span>FEATURE CONTROL &amp; FLAGS</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Feature Management &amp; Dynamic Flags
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Aktifkan atau nonaktifkan fitur opsional aplikasi secara instan tanpa mengganggu integritas database atau source code.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-4 py-2.5 rounded-full border border-slate-800 bg-[#0e131f] text-slate-200 font-bold text-xs">
              Optional Active: <strong className="text-cyan-400 font-extrabold">{optionalFeatures.filter((f) => flags[f.key]).length} / {optionalFeatures.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-2xl border border-blue-500/30 bg-[#081324] p-4 flex items-start gap-3.5 text-xs shadow-xl">
        <Lock className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-extrabold text-white text-sm">Sistem Keamanan Core Architecture</h4>
          <p className="text-blue-200/90 text-xs leading-relaxed">
            Fitur dalam kategori <strong className="text-white">CORE</strong> dilindungi secara permanen untuk menjamin fungsi dasar toko (Katalog, Checkout, Auth) berjalan 100% stabil.
          </p>
        </div>
      </div>

      {/* Section 1: CORE FEATURES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-cyan-400" />
            <span>Fitur Utama (Core Features)</span>
          </h2>
          <span className="rounded-full bg-[#061d2a] text-[#06b6d4] border border-[#06b6d4]/30 px-3 py-0.5 text-[10px] font-extrabold tracking-wide">
            Protected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coreFeatures.map((meta) => (
            <div
              key={meta.key}
              className="p-5 rounded-3xl border border-slate-800/80 bg-[#0c1019] flex items-start justify-between gap-4 shadow-2xl"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-white text-sm">{meta.label}</h3>
                  <span className="rounded-full bg-[#082114] text-[#10b981] border border-[#10b981]/30 px-2.5 py-0.5 text-[9px] font-extrabold">
                    ALWAYS ENABLED
                  </span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{meta.description}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#070a10] border border-slate-800 text-slate-500">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: OPTIONAL FEATURES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Fitur Opsional (Modular Modules)</span>
          </h2>
          <span className="text-slate-400 text-xs font-semibold">
            {optionalFeatures.filter((f) => flags[f.key]).length} / {optionalFeatures.length} Fitur Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {optionalFeatures.map((meta) => {
            const isEnabled = flags[meta.key] ?? meta.defaultState;
            const isUpdating = updatingKey === meta.key;

            return (
              <div
                key={meta.key}
                className={`p-5 rounded-3xl border transition-all duration-200 flex items-start justify-between gap-4 shadow-2xl ${
                  isEnabled
                    ? 'border-cyan-500/30 bg-[#0c1019]'
                    : 'border-slate-800/80 bg-[#070a10] opacity-80'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-white text-sm">{meta.label}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-extrabold text-[9px] ${
                        isEnabled
                          ? 'bg-[#061d2a] text-[#06b6d4] border border-[#06b6d4]/30'
                          : 'bg-[#181d28] text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{meta.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleClick(meta)}
                  disabled={isUpdating}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isEnabled ? 'bg-cyan-500' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: AUDIT LOGS WITH PAGINATION (Matches Inventory table panel style) */}
      <div className="rounded-3xl border border-slate-800/80 bg-[#0c1019] p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <History className="h-4 w-4 text-cyan-400" />
            <span>Audit Log Perubahan Feature Flags ({auditLogs.length})</span>
          </h3>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">Belum ada riwayat perubahan feature flag.</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2.5">
              {paginatedAuditLogs.map((log) => {
                const isEnabledAction = log.action === 'FEATURE_ENABLED';

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-[#070a10] border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                          isEnabledAction
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {log.action}
                      </span>
                      <div>
                        <p className="font-bold text-white">
                          Fitur <span className="text-cyan-400">{log.entityId}</span> {isEnabledAction ? 'Diaktifkan' : 'Dinonaktifkan'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Oleh: {log.actor?.name || log.actor?.email || 'Admin System'}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDateJakarta(log.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pagination Component */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalAuditPages}
              totalItems={totalAuditItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* ACTIVE PROCESS WARNING MODAL */}
      {pendingDisableKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-[#0c1019] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="font-bold text-base text-white">Konfirmasi Mematikan Fitur</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {FEATURE_FLAGS_CONFIG[pendingDisableKey]?.activeWarningMessage ||
                `Apakah Anda yakin ingin mematikan fitur ${pendingDisableKey}?`}
            </p>

            <div className="p-3 rounded-xl bg-[#070a10] border border-slate-800 text-[11px] text-slate-400">
              ℹ️ Mematikan fitur ini hanya menyembunyikan akses &amp; mematikan proses background tanpa menghapus data historis di database.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPendingDisableKey(null)}
                className="px-4 py-2 rounded-full border border-slate-800 bg-[#0e131f] text-slate-300 hover:text-white text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeToggle(pendingDisableKey, false)}
                className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition shadow-lg shadow-rose-500/20"
              >
                Matikan Fitur Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
