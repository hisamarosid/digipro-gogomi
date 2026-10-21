'use client';

import React, { useState } from 'react';
import { Bell, Send, ShieldAlert, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminNotificationSettingsPage() {
  const [retentionDays, setRetentionDays] = useState(365);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleSendTestNotification = async () => {
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ADMIN_TEST_NOTIFICATION',
          category: 'SYSTEM',
          severity: 'INFO',
          title: '🔔 Uji Coba In-App Notification Admin',
          message: 'Ini adalah notifikasi simulasi untuk memastikan bell and popover notifikasi admin berfungsi sempurna.',
          actionUrl: '/admin/notifications',
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Notifikasi simulasi berhasil dikirim ke bell admin!');
      } else {
        toast.error('Gagal mengirim notifikasi simulasi');
      }
    } catch {
      toast.error('Gagal mengirim notifikasi simulasi');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
          <Bell className="h-7 w-7 text-cyan-400" />
          <span>Pengaturan System Notifikasi Admin</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Konfigurasi retensi notifikasi operasional dan jalankan tes pengiriman notifikasi in-app.
        </p>
      </div>

      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Pengaturan Retention Audit History Notifikasi
        </h2>

        <div className="space-y-2 text-xs">
          <label className="block text-slate-300 font-bold">Lama Penyimpanan History (Hari)</label>
          <input
            type="number"
            value={retentionDays}
            onChange={(e) => setRetentionDays(parseInt(e.target.value, 10) || 365)}
            className="w-full max-w-xs px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-cyan-500 focus:outline-none"
          />
          <p className="text-[11px] text-slate-400">
            Notifikasi non-kritis yang lebih tua dari batas ini akan di-archive otomatis.
          </p>
        </div>
      </div>

      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-400" />
          <span>Uji Coba Pengiriman Notifikasi (Dev Helper)</span>
        </h2>
        <p className="text-xs text-slate-400">
          Gunakan tombol di bawah untuk menguji apakah ikon bell dan popover notifikasi admin menerima pesan real-time.
        </p>

        <button
          type="button"
          disabled={isSendingTest}
          onClick={handleSendTestNotification}
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          <span>{isSendingTest ? 'Mengirim...' : 'Kirim Notifikasi Simulasi ke Admin'}</span>
        </button>
      </div>
    </div>
  );
}
