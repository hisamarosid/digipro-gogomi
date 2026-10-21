'use client';

import React from 'react';
import { RefreshCw, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';

interface AdminRenewalsClientProps {
  expiring7Days: number;
  renewalOrdersCount: number;
  renewalRevenue: number;
  renewalRatePct: string;
  renewalOrders: any[];
}

export function AdminRenewalsClient({
  expiring7Days,
  renewalOrdersCount,
  renewalRevenue,
  renewalRatePct,
  renewalOrders,
}: AdminRenewalsClientProps) {
  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retention &amp; Subscription Renewal</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Perpanjangan (Renewals)
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Pantau kinerja perpanjangan langganan produk digital, renewal rate, dan pendapatan recurring.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Expiring (7 Hari)</p>
          <p className="text-2xl font-black text-amber-300">{expiring7Days}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Renewal Orders</p>
          <p className="text-2xl font-black text-white">{renewalOrdersCount}</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Renewal Rate %</p>
          <p className="text-2xl font-black text-emerald-300">{renewalRatePct}%</p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Omset Recurring</p>
          <p className="text-2xl font-black text-cyan-300 font-mono">Rp {renewalRevenue.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* Renewal Orders Table */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Daftar Transaksi Renewal</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-4">No. Order</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Produk Varian</th>
                <th className="p-4">Total Bayar</th>
                <th className="p-4">Status</th>
                <th className="p-4">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {renewalOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                    Belum ada transaksi renewal.
                  </td>
                </tr>
              ) : (
                renewalOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40">
                    <td className="p-4 font-bold text-cyan-400">{o.orderNumber}</td>
                    <td className="p-4 font-sans font-medium text-white">
                      {o.user?.name || o.guestName || 'Customer'}
                    </td>
                    <td className="p-4 font-sans text-slate-300">{o.items[0]?.productName}</td>
                    <td className="p-4 font-bold text-white">Rp{o.grandTotal.toLocaleString('id-ID')}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-sans">{new Date(o.createdAt).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
