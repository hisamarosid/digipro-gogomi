'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Lock, HelpCircle } from 'lucide-react';

interface AdminAccessDeniedProps {
  title?: string;
  message?: string;
  userRole?: string;
  requiredPermission?: string;
}

export function AdminAccessDenied({
  title = 'Akses Ditolak (403 Forbidden)',
  message,
  userRole,
  requiredPermission,
}: AdminAccessDeniedProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl bg-slate-900/90 border border-rose-500/30 p-8 text-center space-y-6 shadow-2xl shadow-rose-950/40 relative overflow-hidden backdrop-blur-md">
        
        {/* Background glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
          <ShieldAlert className="w-8 h-8 stroke-[2.5]" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <Lock className="h-5 w-5 text-rose-400" />
            <span>{title}</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {message || (
              <>
                Akun Anda {userRole ? <span className="font-bold text-white">({userRole})</span> : null} tidak memiliki izin akses untuk membuka halaman ini.
              </>
            )}
          </p>
        </div>

        {requiredPermission && (
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Izin Akses yang Dibutuhkan:
            </span>
            <span className="text-xs font-mono text-cyan-400 font-semibold block truncate">
              {requiredPermission}
            </span>
          </div>
        )}

        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2 text-left">
          <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            Jika Anda memerlukan akses ke fitur ini, silakan hubungi <strong>Super Admin</strong> untuk menambahkan izin di menu <em>Admin Management</em>.
          </span>
        </div>

        <div className="pt-2">
          <Link
            href="/admin"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 text-xs font-bold transition border border-slate-700 shadow-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Dashboard Overview</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
