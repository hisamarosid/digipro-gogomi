'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Receipt, Copy, MessageCircle, Loader2, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatIDR } from '@/lib/utils/formatters';

interface CreatedLink {
  url: string;
  expiresAt: string;
  title: string;
  total: number;
}

export function InvoiceLinkClient() {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [qty, setQty] = useState('1');
  const [validDays, setValidDays] = useState('3');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState<'link' | 'wa' | null>(null);

  const amountNumber = Number(amount.replace(/\D/g, '')) || 0;
  const qtyNumber = Number(qty) || 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setCreated(null);
    try {
      const res = await fetch('/api/admin/orders/invoice-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, amount: amountNumber, qty: qtyNumber, validDays: Number(validDays), note }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const url = json.data.url.startsWith('http') ? json.data.url : `${window.location.origin}${json.data.url}`;
        setCreated({ url, expiresAt: json.data.expiresAt, title, total: amountNumber * qtyNumber });
      } else {
        toast.error(json.error || 'Gagal membuat link tagihan');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsLoading(false);
    }
  };

  const waText = created
    ? `Halo kak, berikut tagihan untuk *${created.title}* sebesar *${formatIDR(created.total)}*.\n\nSilakan bayar lewat link ini (QRIS):\n${created.url}\n\nLink berlaku sampai ${new Date(created.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}. Setelah bayar, pesanan langsung kami kerjakan. Terima kasih!`
    : '';

  const copy = async (text: string, kind: 'link' | 'wa') => {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    toast.success(kind === 'link' ? 'Link disalin' : 'Pesan WhatsApp disalin');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-3">
        <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Pesanan
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Buat Tagihan Jasa</h1>
            <p className="text-xs text-slate-400">Harga bebas per pelanggan. Kirim link pembayarannya lewat WhatsApp.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-4 text-xs">
        <div className="space-y-1.5">
          <label className="font-bold uppercase tracking-wide text-slate-400 text-[11px]">Nama Jasa *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
            placeholder="Contoh: Pembuatan Website Toko Online"
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="font-bold uppercase tracking-wide text-slate-400 text-[11px]">Harga (Rp) *</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              required
              placeholder="800000"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold uppercase tracking-wide text-slate-400 text-[11px]">Jumlah</label>
            <input
              type="number"
              min={1}
              max={99}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm font-mono text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold uppercase tracking-wide text-slate-400 text-[11px]">Catatan untuk Pelanggan (opsional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Contoh: Estimasi pengerjaan 7 hari. Termasuk 2x revisi."
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-bold uppercase tracking-wide text-slate-400 text-[11px]">Link Berlaku</label>
          <select
            value={validDays}
            onChange={(e) => setValidDays(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="1">1 hari</option>
            <option value="3">3 hari</option>
            <option value="7">7 hari</option>
            <option value="14">14 hari</option>
          </select>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-slate-950 border border-slate-800 p-3">
          <span className="text-slate-400">Total yang ditagih</span>
          <span className="font-black text-emerald-400 text-base">{formatIDR(amountNumber * qtyNumber)}</span>
        </div>

        <button
          type="submit"
          disabled={isLoading || amountNumber < 1000}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 py-3 text-sm font-bold text-slate-950 transition disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
          <span>Buat Link Pembayaran</span>
        </button>
      </form>

      {created && (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3 text-xs">
          <p className="font-bold text-emerald-300">Link siap dikirim</p>
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] text-cyan-300 break-all">{created.url}</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => copy(created.url, 'link')}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 font-bold text-white"
            >
              {copied === 'link' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>Salin Link</span>
            </button>
            <button
              type="button"
              onClick={() => copy(waText, 'wa')}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 font-bold text-white"
            >
              {copied === 'wa' ? <Check className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
              <span>Salin Pesan WhatsApp</span>
            </button>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Link ini baru membuat pesanan saat pelanggan membukanya dan menekan Bayar. Waktu bayar QRIS-nya 15 menit sejak saat itu.
            Setelah lunas, pesanan muncul di daftar Pesanan dengan status PROCESSING. Kerjakan jasanya, lalu kirim hasilnya lewat tombol <strong>Kirim Manual</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
