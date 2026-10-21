'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  LifeBuoy,
  Send,
  CheckCircle,
  Clock,
  User,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Paperclip,
  FileText,
  Download,
  X,
} from 'lucide-react';
import { formatDateJakarta } from '@/lib/utils/formatters';
import { toast } from 'sonner';

export function AdminTicketDetailClient({ ticket: initialTicket }: { ticket: any }) {
  const router = useRouter();
  const [ticket, setTicket] = useState(initialTicket);

  const [replyText, setReplyText] = useState('');
  const [replyAttachmentUrl, setReplyAttachmentUrl] = useState('');
  const [replyAttachmentName, setReplyAttachmentName] = useState('');
  const [isUploadingReply, setIsUploadingReply] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-polling for new incoming messages every 5 seconds
  useEffect(() => {
    const fetchLatestTicket = async () => {
      try {
        const res = await fetch(`/api/support/tickets/${ticket.id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setTicket(json.data);
        }
      } catch (err) {
        // silent fetch
      }
    };

    const interval = setInterval(fetchLatestTicket, 5000);
    return () => clearInterval(interval);
  }, [ticket.id]);

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setTicket(json.data);
        toast.success('Pesan & status tiket berhasil diperbarui');
      }
    } catch {
      toast.error('Gagal memperbarui tiket');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    setIsUploadingReply(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        toast.success('File berhasil diunggah!');
        setReplyAttachmentUrl(json.url);
        setReplyAttachmentName(json.filename);
      } else {
        toast.error(json.error || 'Gagal mengunggah file');
      }
    } catch {
      toast.error('Terjadi kesalahan unggah file');
    } finally {
      setIsUploadingReply(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && !replyAttachmentUrl) return;

    setIsSendingReply(true);
    try {
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          message: replyText.trim(),
          attachmentUrl: replyAttachmentUrl,
          attachmentName: replyAttachmentName,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Balasan Staff berhasil dikirim!');
        setReplyText('');
        setReplyAttachmentUrl('');
        setReplyAttachmentName('');
        setTicket((prev: any) => ({
          ...prev,
          status: 'WAITING_CUSTOMER',
          messages: [...(prev.messages || []), json.data],
          updatedAt: new Date().toISOString(),
        }));
      } else {
        toast.error(json.error || 'Gagal mengirim balasan');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Status tiket diubah menjadi ${newStatus}`);
        setTicket((prev: any) => ({
          ...prev,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        }));
      } else {
        toast.error(json.error || 'Gagal memperbarui status');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdatePriority = async (newPriority: string) => {
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Prioritas diubah menjadi ${newPriority}`);
        setTicket((prev: any) => ({
          ...prev,
          priority: newPriority,
          updatedAt: new Date().toISOString(),
        }));
      } else {
        toast.error(json.error || 'Gagal memperbarui prioritas');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan');
    }
  };

  const renderAttachment = (url: string, name?: string) => {
    const isImage = /\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(url);
    if (isImage) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2 group">
          <img
            src={url}
            alt={name || 'Lampiran File'}
            className="max-h-48 max-w-full rounded-xl border border-slate-700/80 object-cover group-hover:opacity-90 transition"
          />
          <span className="text-[10px] text-slate-400 mt-1 block hover:underline">
            🔍 Lihat Gambar Penuh ({name || 'Lampiran'})
          </span>
        </a>
      );
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-sky-400 hover:text-sky-300 font-bold transition"
      >
        <FileText className="h-4 w-4" />
        <span className="truncate max-w-[200px]">{name || 'Lihat / Unduh File'}</span>
        <Download className="h-3.5 w-3.5 ml-1" />
      </a>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold px-3 py-1 rounded-full">OPEN (Baru)</span>;
      case 'IN_PROGRESS':
        return <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px] font-bold px-3 py-1 rounded-full">IN PROGRESS</span>;
      case 'WAITING_CUSTOMER':
        return <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px] font-bold px-3 py-1 rounded-full">WAITING USER</span>;
      case 'RESOLVED':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold px-3 py-1 rounded-full">RESOLVED (Selesai)</span>;
      case 'CLOSED':
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-bold px-3 py-1 rounded-full">CLOSED (Ditutup)</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 text-[11px] font-bold px-3 py-1 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Navigation & Real-time Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/support"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <span className="font-mono text-xs font-bold text-rose-400">
              {ticket.ticketNumber}
            </span>
            <h1 className="text-xl font-extrabold text-white">{ticket.subject}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Real-time Live Sync</span>
          </span>

          <button
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition text-xs font-bold"
            title="Refresh Pesanan / Chat"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-rose-400' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Conversation History & Reply Form */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-6">
            <h3 className="font-extrabold text-white text-sm border-b border-slate-800 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-rose-400" />
                <span>Riwayat Percakapan Tiket ({ticket.messages?.length || 0})</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Auto-update 5s</span>
            </h3>

            {/* Conversation Thread */}
            <div className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 min-h-[300px] max-h-[500px] overflow-y-auto">
              {ticket.messages && ticket.messages.length > 0 ? (
                ticket.messages.map((m: any) => {
                  const isStaff = m.senderType === 'STAFF';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col max-w-[85%] ${
                        isStaff ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 text-[10px] text-slate-400">
                        <span className={`font-bold ${isStaff ? 'text-emerald-400' : 'text-cyan-400'}`}>
                          {isStaff ? 'Tim Support (Staff / Anda)' : `Pelanggan: ${ticket.user?.name || 'User'}`}
                        </span>
                        <span>•</span>
                        <span>{formatDateJakarta(m.createdAt)}</span>
                      </div>

                      <div
                        className={`p-4 rounded-2xl text-xs leading-relaxed ${
                          isStaff
                            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 rounded-tr-none'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {m.message && <p className="whitespace-pre-line">{m.message}</p>}
                        {m.attachmentUrl && renderAttachment(m.attachmentUrl, m.attachmentName)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Belum ada percakapan pada tiket ini.
                </div>
              )}
            </div>

            {/* Staff Reply Form with Attachment */}
            <form onSubmit={handleSendReply} className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-300">
                Balas Tiket Ini Sebagai Support Staff:
              </label>

              {replyAttachmentUrl && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-emerald-300 text-xs self-start w-fit">
                  <FileText className="h-4 w-4" />
                  <span className="truncate max-w-[200px] font-bold">{replyAttachmentName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyAttachmentUrl('');
                      setReplyAttachmentName('');
                    }}
                    className="text-slate-400 hover:text-rose-400 ml-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-end gap-2">
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Tulis pesan balasan/instruksi garansi untuk pelanggan..."
                  className="flex-1 w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleUploadFile(e.target.files[0]);
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingReply}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-400 transition"
                  title="Lampirkan File / Foto"
                >
                  <Paperclip className={`h-4 w-4 ${isUploadingReply ? 'animate-bounce text-emerald-400' : ''}`} />
                </button>

                <button
                  type="submit"
                  disabled={isSendingReply || (!replyText.trim() && !replyAttachmentUrl)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-5 py-3 transition shadow-md shadow-emerald-500/20 disabled:opacity-50 shrink-0"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSendingReply ? 'Kirim...' : 'Kirim Balasan Staff'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Ticket Controls & Metadata Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-6 sticky top-24">
            
            {/* Status Header */}
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                Status Tiket Saat Ini
              </span>
              <div>{getStatusBadge(ticket.status)}</div>
            </div>

            {/* Customer Details Box */}
            <div className="space-y-3 pt-4 border-t border-slate-800 text-xs">
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">
                Informasi Pelanggan
              </h4>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <p className="font-bold text-white text-sm">{ticket.user?.name}</p>
                <p className="text-slate-400 text-xs">{ticket.user?.email}</p>
              </div>
            </div>

            {/* Ticket Information Box */}
            <div className="space-y-3 pt-4 border-t border-slate-800 text-xs">
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">
                Rincian Tiket
              </h4>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Kategori:</span>
                  <span className="font-bold text-white">{ticket.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Prioritas:</span>
                  <span className="font-bold text-rose-400">{ticket.priority}</span>
                </div>
                {ticket.order && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">No. Pesanan:</span>
                    <span className="font-mono font-bold text-cyan-400">{ticket.order.orderNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Dibuat Pada:</span>
                  <span className="text-slate-300">{formatDateJakarta(ticket.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Status Selectors */}
            <div className="space-y-3 pt-4 border-t border-slate-800 text-xs">
              <label className="font-bold text-slate-300 block">Ubah Status Tiket:</label>
              <select
                value={ticket.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                disabled={isUpdatingStatus}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:border-rose-500 font-bold"
              >
                <option value="OPEN">OPEN (Baru)</option>
                <option value="IN_PROGRESS">IN PROGRESS (Sedang Diproses)</option>
                <option value="WAITING_CUSTOMER">WAITING CUSTOMER (Menunggu User)</option>
                <option value="RESOLVED">RESOLVED (Telah Selesai)</option>
                <option value="CLOSED">CLOSED (Ditutup)</option>
              </select>

              <label className="font-bold text-slate-300 block pt-2">Ubah Prioritas:</label>
              <select
                value={ticket.priority}
                onChange={(e) => handleUpdatePriority(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:border-rose-500 font-bold"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>

              <button
                onClick={() => handleUpdateStatus('RESOLVED')}
                disabled={isUpdatingStatus || ticket.status === 'RESOLVED'}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 font-extrabold text-xs transition shadow-md shadow-emerald-500/20 disabled:opacity-50 mt-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Tandai Selesai (RESOLVED)</span>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
