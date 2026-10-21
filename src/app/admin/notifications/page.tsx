'use client';

import React from 'react';
import Link from 'next/link';
import { Send, ArrowRight, Settings, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-8 text-center space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
          <Send className="h-4 w-4" />
          <span>Migrasi Notifikasi Admin Selesai</span>
        </div>

        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Admin Web Notification Telah Dimigrasi ke Telegram
        </h1>

        <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          Seluruh notifikasi operasional admin (Order Paid, Waiting Stock, Fulfillment Failed, Replacement, dan System Alert) kini dikirimkan langsung secara realtime ke Telegram Bot Admin.
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition"
          >
            <Settings className="h-4 w-4" />
            <span>Pengaturan Telegram Admin</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/admin/audit-logs"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition"
          >
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <span>Lihat Audit Logs</span>
          </Link>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold">
            <CheckCircle2 className="h-4 w-4" />
            <span>Real-time Telegram Alerts</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Order baru lunas (Order Paid) langsung mengirim pesan Telegram instan dengan tautan cepat menuju order.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <CheckCircle2 className="h-4 w-4" />
            <span>Zero Polling Overhead</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Web notification polling dan bell admin telah dihentikan, mempercepat performa halaman dan mengurangi beban database.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <CheckCircle2 className="h-4 w-4" />
            <span>Customer In-App Intact</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Sistem notifikasi akun customer (Web Notification &amp; Email) tetap berjalan normal tanpa perubahan.
          </p>
        </div>
      </div>
    </div>
  );
}
