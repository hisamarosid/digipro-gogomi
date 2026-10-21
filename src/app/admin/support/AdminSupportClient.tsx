'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatDateJakarta } from '@/lib/utils/formatters';
import { Pagination } from '@/components/ui/Pagination';
import {
  LifeBuoy,
  Search,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Send,
  User,
  Clock,
  ChevronRight,
  ShieldCheck,
  Plus,
  X,
  ExternalLink,
  RefreshCw,
  Paperclip,
  FileText,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadToCloudinaryDirect } from '@/lib/cloudinary-client';

interface AdminSupportClientProps {
  tickets: any[];
  customers: any[];
}

export function AdminSupportClient({ tickets: initialTickets, customers }: AdminSupportClientProps) {
  const [tickets, setTickets] = useState<any[]>(initialTickets || []);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(initialTickets[0] || null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isSyncing, setIsSyncing] = useState(false);

  // New Ticket Modal State for Admin & Attachment
  const [showNewModal, setShowNewModal] = useState(false);
  const [newUserId, setNewUserId] = useState(customers[0]?.id || '');
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('GARANSI');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newMessage, setNewMessage] = useState('');
  const [newAttachment, setNewAttachment] = useState<{ publicId: string; url: string; originalFilename: string; bytes?: number } | null>(null);
  const [isUploadingNew, setIsUploadingNew] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  // Staff reply state & attachment
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState<{ publicId: string; url: string; originalFilename: string; bytes?: number } | null>(null);
  const [isUploadingReply, setIsUploadingReply] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-polling for new incoming tickets and messages every 6 seconds
  useEffect(() => {
    const fetchLatestTickets = async () => {
      try {
        const res = await fetch('/api/admin/support/tickets');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setTickets(json.data);
          if (selectedTicket) {
            const updated = json.data.find((t: any) => t.id === selectedTicket.id);
            if (updated) setSelectedTicket(updated);
          }
        }
      } catch (err) {
        // silent fetch
      }
    };

    const interval = setInterval(fetchLatestTickets, 6000);
    return () => clearInterval(interval);
  }, [selectedTicket]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/support/tickets');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTickets(json.data);
        if (selectedTicket) {
          const updated = json.data.find((t: any) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
        toast.success('Daftar tiket & pesan berhasil disinkronisasi!');
      }
    } catch {
      toast.error('Gagal menyinkronkan tiket');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUploadFile = async (file: File, isReply: boolean) => {
    if (isReply) setIsUploadingReply(true);
    else setIsUploadingNew(true);

    try {
      const result = await uploadToCloudinaryDirect(file, {
        purpose: 'SUPPORT_ATTACHMENT',
        ticketId: isReply && selectedTicket ? selectedTicket.id : undefined,
      });

      toast.success('Lampiran gambar berhasil diunggah ke Cloudinary!');
      if (isReply) {
        setReplyAttachment({
          publicId: result.publicId,
          url: result.secureUrl || result.url,
          originalFilename: result.originalFilename,
          bytes: result.bytes,
        });
      } else {
        setNewAttachment({
          publicId: result.publicId,
          url: result.secureUrl || result.url,
          originalFilename: result.originalFilename,
          bytes: result.bytes,
        });
      }
    } catch (err: any) {
      console.error('Admin support upload error:', err);
      toast.error(err.message || 'Terjadi kesalahan unggah lampiran');
    } finally {
      if (isReply) setIsUploadingReply(false);
      else setIsUploadingNew(false);
    }
  };

  const handleCreateTicketByAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId || !newSubject.trim() || (!newMessage.trim() && !newAttachment)) {
      toast.error('Pelanggan, Subjek, dan Pesan/Lampiran wajib diisi');
      return;
    }

    setIsCreatingTicket(true);
    try {
      const res = await fetch('/api/admin/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: newUserId,
          subject: newSubject.trim(),
          category: newCategory,
          priority: newPriority,
          message: newMessage.trim(),
          attachments: newAttachment ? [newAttachment] : undefined,
          attachmentUrl: newAttachment?.url || undefined,
          attachmentName: newAttachment?.originalFilename || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Tiket support baru berhasil dibuat!');
        setShowNewModal(false);
        setNewSubject('');
        setNewMessage('');
        setNewAttachment(null);
        setTickets((prev) => [json.data, ...prev]);
        setSelectedTicket(json.data);
      } else {
        toast.error(json.error || 'Gagal membuka tiket baru');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleSendStaffReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || (!replyText.trim() && !replyAttachment)) return;

    setIsSendingReply(true);
    try {
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          message: replyText.trim(),
          attachments: replyAttachment ? [replyAttachment] : undefined,
          attachmentUrl: replyAttachment?.url || undefined,
          attachmentName: replyAttachment?.originalFilename || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Balasan Staff berhasil dikirim!');
        setReplyText('');
        setReplyAttachment(null);

        const updatedTicket = {
          ...selectedTicket,
          status: 'WAITING_CUSTOMER',
          messages: [...(selectedTicket.messages || []), json.data],
          updatedAt: new Date().toISOString(),
        };
        setSelectedTicket(updatedTicket);
        setTickets((prev) =>
          prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
        );
      } else {
        toast.error(json.error || 'Gagal mengirim balasan');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket) return;

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Status tiket diubah menjadi ${newStatus}`);
        const updatedTicket = {
          ...selectedTicket,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
        setSelectedTicket(updatedTicket);
        setTickets((prev) =>
          prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
        );
      } else {
        toast.error(json.error || 'Gagal memperbarui status');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdatePriority = async (newPriority: string) => {
    if (!selectedTicket) return;

    try {
      const res = await fetch(`/api/admin/support/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Prioritas diubah menjadi ${newPriority}`);
        const updatedTicket = {
          ...selectedTicket,
          priority: newPriority,
          updatedAt: new Date().toISOString(),
        };
        setSelectedTicket(updatedTicket);
        setTickets((prev) =>
          prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
        );
      } else {
        toast.error(json.error || 'Gagal memperbarui prioritas');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi');
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
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded">OPEN</span>;
      case 'IN_PROGRESS':
        return <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded">IN PROGRESS</span>;
      case 'WAITING_CUSTOMER':
        return <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded">WAITING USER</span>;
      case 'RESOLVED':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded">RESOLVED</span>;
      case 'CLOSED':
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded">CLOSED</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2.5 py-0.5 rounded">{status}</span>;
    }
  };

  const filteredTickets = tickets.filter((t: any) => {
    const matchesSearch =
      (t.ticketNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalTicketsCount = tickets.length;
  const openTicketsCount = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgressTicketsCount = tickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'WAITING_CUSTOMER').length;
  const resolvedTicketsCount = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <LifeBuoy className="h-3.5 w-3.5" />
              <span>Customer Helpdesk &amp; Warranty Claims</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Pusat Tiket Support &amp; Klaim Garansi
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Respon tiket kendala customer secara real-time, kelola lampiran bukti kendala, dan berikan solusi garansi penggantian atau refund.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-3 text-xs font-bold transition border border-slate-700"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Sync</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Buka Tiket Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tiket</p>
          <p className="text-2xl font-black text-white">{totalTicketsCount}</p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Tiket Baru (Open)</p>
          <p className="text-2xl font-black text-amber-300">{openTicketsCount}</p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Sedang Diproses</p>
          <p className="text-2xl font-black text-cyan-300">{inProgressTicketsCount}</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Selesai (Resolved)</p>
          <p className="text-2xl font-black text-emerald-300">{resolvedTicketsCount}</p>
        </div>
      </div>

      {/* Modal: Admin Create Support Ticket */}
      {showNewModal && (
        <div className="rounded-3xl glass-panel border border-emerald-500/40 bg-slate-900/95 p-6 space-y-4 shadow-2xl relative">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-emerald-400" />
              <span>Buka Tiket Bantuan Baru Untuk Pelanggan</span>
            </h3>
            <button
              onClick={() => setShowNewModal(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleCreateTicketByAdmin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Pilih Pelanggan *</label>
              <select
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white focus:border-emerald-500 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Subjek Tiket *</label>
              <input
                type="text"
                required
                placeholder="Contoh: Penggantian Lisensi Canva Pro Garansi"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Kategori Tiket</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="GARANSI">Klaim Garansi Produk</option>
                  <option value="KREDENSIAL">Bantuan Kredensial / Login</option>
                  <option value="PEMBAYARAN">Pertanyaan Pembayaran</option>
                  <option value="LAINNYA">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Prioritas Tiket</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="LOW">LOW (Rendah)</option>
                  <option value="MEDIUM">MEDIUM (Sedang)</option>
                  <option value="HIGH">HIGH (Tinggi)</option>
                  <option value="URGENT">URGENT (Darurat)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Pesan / Instruksi Pertama *</label>
              <textarea
                required
                rows={4}
                placeholder="Tuliskan pesan instruksi atau bantuan awal untuk pelanggan ini..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Admin Upload Attachment Area */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">Lampirkan Bukti Foto / File (Opsional)</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={newFileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleUploadFile(e.target.files[0], false);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => newFileInputRef.current?.click()}
                  disabled={isUploadingNew}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition font-bold"
                >
                  <Paperclip className="h-4 w-4 text-emerald-400" />
                  <span>{isUploadingNew ? 'Mengunggah ke Cloudinary...' : 'Pilih File / Foto'}</span>
                </button>

                {newAttachment && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-emerald-300">
                    <FileText className="h-4 w-4" />
                    <span className="truncate max-w-[150px] font-bold">{newAttachment.originalFilename}</span>
                    <button
                      type="button"
                      onClick={() => setNewAttachment(null)}
                      className="text-slate-400 hover:text-rose-400 ml-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isCreatingTicket}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-extrabold hover:bg-emerald-400 transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {isCreatingTicket ? 'Membuka...' : 'Buka Tiket Sekarang'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari No. Tiket, subjek, nama pelanggan, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-rose-500 w-full sm:w-auto font-bold"
        >
          <option value="ALL">Semua Status Tiket</option>
          <option value="OPEN">OPEN (Baru Masuk)</option>
          <option value="IN_PROGRESS">IN PROGRESS (Sedang Diproses)</option>
          <option value="WAITING_CUSTOMER">WAITING CUSTOMER (Menunggu Balasan User)</option>
          <option value="RESOLVED">RESOLVED (Telah Teratasi)</option>
          <option value="CLOSED">CLOSED (Ditutup)</option>
        </select>
      </div>

      {/* Grid Layout: Left Ticket List & Right Detail Conversation View */}
      {filteredTickets.length === 0 ? (
        <div className="rounded-3xl glass-panel border border-slate-800 p-12 text-center text-slate-400 text-xs">
          Tidak ada tiket support ditemukan.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Tickets List */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Daftar Tiket ({filteredTickets.length})
            </h3>

            <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
              {paginatedTickets.map((t: any) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`w-full text-left p-4 rounded-2xl border transition space-y-2 cursor-pointer ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/10'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-rose-400">
                          {t.ticketNumber}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            t.priority === 'URGENT' || t.priority === 'HIGH'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>
                      {getStatusBadge(t.status)}
                    </div>

                    <h4 className="font-bold text-white text-xs line-clamp-1">{t.subject}</h4>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
                      <span>User: <strong className="text-slate-200">{t.user?.name || 'Pelanggan'}</strong></span>
                      <Link
                        href={`/admin/support/${t.id}`}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setSelectedTicket(t);
                        }}
                        className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg transition"
                      >
                        <span>Buka Tiket</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredTickets.length / itemsPerPage)}
              totalItems={filteredTickets.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Right Column: Ticket Conversation & Management Pane */}
          <div className="lg:col-span-7">
            {selectedTicket ? (
              <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 space-y-5">
                
                {/* Ticket Header & Status Control Bar */}
                <div className="border-b border-slate-800 pb-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                        {selectedTicket.ticketNumber}
                      </span>
                      {getStatusBadge(selectedTicket.status)}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateStatus('RESOLVED')}
                        disabled={isUpdatingStatus || selectedTicket.status === 'RESOLVED'}
                        className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold px-3 py-1.5 rounded-xl transition disabled:opacity-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Tandai Selesai (RESOLVED)</span>
                      </button>
                    </div>
                  </div>

                  <h2 className="text-lg font-extrabold text-white">{selectedTicket.subject}</h2>

                  {/* Customer & Order Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 text-[10px] block font-bold uppercase">Pelanggan</span>
                      <span className="font-bold text-white text-sm">{selectedTicket.user?.name || 'Pelanggan'}</span>
                      <span className="text-slate-400 block text-[11px]">{selectedTicket.user?.email}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] block font-bold uppercase">Detail Tiket</span>
                      <span className="text-slate-300">Kategori: <strong>{selectedTicket.category}</strong></span>
                      {selectedTicket.order && (
                        <span className="block text-cyan-400 font-mono font-bold">
                          Pesanan #: {selectedTicket.order.orderNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Control Selectors: Status & Priority */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-400">Ubah Status:</span>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateStatus(e.target.value)}
                        disabled={isUpdatingStatus}
                        className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1 text-xs text-white focus:border-rose-500 font-bold"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="WAITING_CUSTOMER">WAITING CUSTOMER</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-400">Prioritas:</span>
                      <select
                        value={selectedTicket.priority}
                        onChange={(e) => handleUpdatePriority(e.target.value)}
                        className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1 text-xs text-white focus:border-rose-500 font-bold"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Conversation History Box */}
                <div className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 min-h-[250px] max-h-[400px] overflow-y-auto">
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((m: any) => {
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
                              {isStaff ? 'Tim Support (Staff / Anda)' : `Pelanggan: ${selectedTicket.user?.name || 'User'}`}
                            </span>
                            <span>•</span>
                            <span>{formatDateJakarta(m.createdAt)}</span>
                          </div>

                          <div
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                              isStaff
                                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 rounded-tr-none'
                                : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                            }`}
                          >
                            {m.message && <p className="whitespace-pre-line">{m.message}</p>}
                            {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                              <div className="space-y-2 mt-2">
                                {m.attachments.map((att: any) =>
                                  renderAttachment(
                                    `/api/support/attachments/${att.id}?redirect=true`,
                                    att.originalFilename || 'Foto Bukti'
                                  )
                                )}
                              </div>
                            )}
                            {m.attachmentUrl && (!m.attachments || m.attachments.length === 0) && renderAttachment(m.attachmentUrl, m.attachmentName)}
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
                <form onSubmit={handleSendStaffReply} className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-slate-300">
                    Balas Tiket Sebagai Support Staff:
                  </label>

                  {replyAttachment && (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-emerald-300 text-xs self-start w-fit">
                      <FileText className="h-4 w-4" />
                      <span className="truncate max-w-[200px] font-bold">{replyAttachment.originalFilename}</span>
                      {replyAttachment.bytes && (
                        <span className="text-[10px] text-slate-400">
                          ({Math.round(replyAttachment.bytes / 1024)} KB)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setReplyAttachment(null)}
                        className="text-slate-400 hover:text-rose-400 ml-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Tulis pesan respon/jawaban atau instruksi penggantian akun untuk pelanggan..."
                      className="flex-1 rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                    />

                    <input
                      type="file"
                      ref={replyFileInputRef}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleUploadFile(e.target.files[0], true);
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => replyFileInputRef.current?.click()}
                      disabled={isUploadingReply}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-400 transition"
                      title="Lampirkan File / Foto"
                    >
                      <Paperclip className={`h-4 w-4 ${isUploadingReply ? 'animate-bounce text-emerald-400' : ''}`} />
                    </button>

                    <button
                      type="submit"
                      disabled={isSendingReply || (!replyText.trim() && !replyAttachment)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-4 py-3 transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      <span>{isSendingReply ? 'Kirim...' : 'Kirim Balasan Staff'}</span>
                    </button>
                  </div>
                </form>

              </div>
            ) : (
              <div className="rounded-3xl glass-panel border border-slate-800 p-12 text-center text-slate-400 text-xs">
                Pilih tiket di sebelah kiri untuk merespon dan mengelola status bantuan pelanggan.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
