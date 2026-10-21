import React from 'react';
import Link from 'next/link';
import { Activity, Cpu, ShieldAlert, Clock, HeartPulse, Zap } from 'lucide-react';

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Cpu className="h-3.5 w-3.5" />
              <span>Operations &amp; Fulfillment Reliability</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Pusat Operasional &amp; Keandalan Sistem
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Monitoring antrean fulfillment otomatis, kesehatan inventori (FEFO), lifecycle reservasi stok checkout, dan diagnostik otomatis.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-1.5 rounded-2xl text-xs font-bold shrink-0">
            <Link
              href="/admin/operations/fulfillment"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-cyan-400 hover:text-white transition"
            >
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              <span>Fulfillment Queue</span>
            </Link>

            <Link
              href="/admin/operations/inventory-health"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-emerald-400 hover:text-white transition"
            >
              <HeartPulse className="h-3.5 w-3.5 text-emerald-400" />
              <span>Inventory Health</span>
            </Link>

            <Link
              href="/admin/operations/reservations"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-amber-400 hover:text-white transition"
            >
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>Reservasi Stok</span>
            </Link>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
