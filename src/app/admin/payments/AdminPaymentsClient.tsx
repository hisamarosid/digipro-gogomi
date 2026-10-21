'use client';

import React, { useState } from 'react';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import { CreditCard, Search, ShieldCheck, QrCode, Terminal, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

interface AdminPaymentsClientProps {
  payments: any[];
  paymentLogs: any[];
}

export function AdminPaymentsClient({ payments, paymentLogs }: AdminPaymentsClientProps) {
  const [activeTab, setActiveTab] = useState<'PAYMENTS' | 'LOGS'>('PAYMENTS');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      (p.order?.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.externalTransactionId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.order?.user?.email || p.order?.guestEmail || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalPaymentsCount = payments.length;
  const successPaymentsCount = payments.filter((p) => p.status === 'PAID' || p.status === 'COMPLETED' || p.status === 'SUCCESS').length;
  const totalVolume = payments
    .filter((p) => p.status === 'PAID' || p.status === 'COMPLETED' || p.status === 'SUCCESS')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Payment Gateway &amp; Webhook Logs</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Pembayaran &amp; Webhook AutoGoPay
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Monitoring transaksi pembayaran QRIS otomatis real-time, audit payload webhook masuk, serta status auto-settlement order.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-slate-700 transition"
            >
              <span>Atur API Gateway</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Transaksi</p>
          <p className="text-2xl font-black text-white">{totalPaymentsCount}</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Pembayaran Sukses</p>
          <p className="text-2xl font-black text-emerald-300">{successPaymentsCount}</p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Volume Terproses</p>
          <p className="text-2xl font-black text-cyan-300 font-mono">{formatIDR(totalVolume)}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Log Webhook</p>
          <p className="text-2xl font-black text-white">{paymentLogs.length}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('PAYMENTS')}
          className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl font-bold text-xs transition border-b-2 ${
            activeTab === 'PAYMENTS'
              ? 'bg-slate-900 border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'
          }`}
        >
          <QrCode className="h-4 w-4" />
          <span>Transaksi QRIS ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LOGS')}
          className={`flex items-center gap-2 px-4 py-3 rounded-t-2xl font-bold text-xs transition border-b-2 ${
            activeTab === 'LOGS'
              ? 'bg-slate-900 border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'
          }`}
        >
          <Terminal className="h-4 w-4" />
          <span>Log Webhook Masuk ({paymentLogs.length})</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'PAYMENTS' && (
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Cari transaksi, order ID, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <span className="text-slate-400 text-xs">
              Total: <strong className="text-white">{filteredPayments.length}</strong> Pembayaran
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Belum ada transaksi pembayaran.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <Link href={`/admin/orders/${p.orderId}`} className="font-mono font-bold text-cyan-300 hover:underline">
                          {p.order?.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 font-bold text-[10px] text-cyan-300">
                          {p.provider}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {p.externalTransactionId || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {formatIDR(p.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                            p.status === 'PAID' || p.status === 'SUCCESS' || p.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : p.status === 'PENDING'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-[11px] text-slate-400">
                        {formatDateJakarta(p.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'LOGS' && (
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Tipe Event</th>
                  <th className="py-3 px-4">Payload Snapshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paymentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      Belum ada log webhook tercatat.
                    </td>
                  </tr>
                ) : (
                  paymentLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-[11px] text-slate-400">{formatDateJakarta(l.createdAt)}</td>
                      <td className="py-3 px-4 font-bold text-cyan-300">{l.provider}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-amber-300">{l.eventType || 'CALLBACK'}</td>
                      <td className="py-3 px-4">
                        <pre className="text-[10px] font-mono text-slate-400 max-w-xl truncate bg-slate-900 p-1.5 rounded border border-slate-800">
                          {l.payload}
                        </pre>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
