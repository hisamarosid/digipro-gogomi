'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import {
  LifeBuoy,
  Plus,
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  X,
  RefreshCw,
  Paperclip,
  FileText,
  Download,
  Image as ImageIcon,
  Search,
  ArrowLeft,
  ShieldAlert,
  KeyRound,
  CreditCard,
  HelpCircle,
  Sparkles,
  ExternalLink,
  CheckCheck,
  Headphones,
  Maximize2,
} from 'lucide-react';
import { formatDateJakarta } from '@/lib/utils/formatters';
import { Pagination } from '@/components/ui/Pagination';
import { toast } from 'sonner';
import { uploadToCloudinaryDirect } from '@/lib/cloudinary-client';

interface CustomerSupportClientProps {
  tickets: any[];
  userOrders?: any[];
  userId?: string;
}

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  GARANSI: {
    label: 'Klaim Garansi',
    icon: ShieldAlert,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  KREDENSIAL: {
    label: 'Kredensial / Login',
    icon: KeyRound,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/30',
  },
  PEMBAYARAN: {
    label: 'Pembayaran QRIS',
    icon: CreditCard,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/30',
  },
  LAINNYA: {
    label: 'Kendala Lainnya',
    icon: HelpCircle,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
  },
};

export function CustomerSupportClient({ tickets: initialTickets, userOrders = [] }: CustomerSupportClientProps) {
  const { t } = useLanguage();
  const [tickets, setTickets] = useState<any[]>(initialTickets || []);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    initialTickets?.[0]?.id || null
  );

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mobile View state (true = show chat thread, false = show list)
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(false);

  // New Ticket Form Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('GARANSI');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');

  // Attachments for new ticket form
  const [newAttachment, setNewAttachment] = useState<{ publicId: string; url: string; originalFilename: string; bytes?: number } | null>(null);
  const [isUploadingNew, setIsUploadingNew] = useState(false);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  // Reply message state & attachment
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState<{ publicId: string; url: string; originalFilename: string; bytes?: number } | null>(null);
  const [isUploadingReply, setIsUploadingReply] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lightbox Image Preview
  const [previewImage, setPreviewImage] = useState<{ url: string; name?: string } | null>(null);

  // Selected Ticket computation
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;

  // Auto-scroll chat to bottom when active ticket or message list changes
  useEffect(() => {
    if (selectedTicket?.messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicketId, selectedTicket?.messages?.length]);

  // Polling for new incoming messages / status updates (active when tab visible)
  useEffect(() => {
    const fetchCustomerTickets = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      try {
        const res = await fetch('/api/account/support');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setTickets(json.data);
        }
      } catch {
        // silent fetch
      }
    };

    const interval = setInterval(fetchCustomerTickets, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/account/support');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTickets(json.data);
        toast.success('Pesan & status tiket disinkronkan!');
      }
    } catch {
      toast.error('Gagal menyinkronkan pesan');
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

      toast.success('Lampiran gambar berhasil diunggah secara aman!');
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
      console.error('Support upload error:', err);
      toast.error(err.message || 'Gagal mengunggah lampiran');
    } finally {
      if (isReply) setIsUploadingReply(false);
      else setIsUploadingNew(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Subjek dan deskripsi kendala wajib diisi');
      return;
    }

    try {
      const res = await fetch('/api/account/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          orderId: orderId || undefined,
          message: message.trim(),
          attachments: newAttachment ? [newAttachment] : undefined,
          attachmentUrl: newAttachment?.url || undefined,
          attachmentName: newAttachment?.originalFilename || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Tiket bantuan berhasil dibuat! Tim kami akan segera merespon.');
        setTickets((prev) => [json.data, ...prev]);
        setSelectedTicketId(json.data.id);
        setMobileShowChat(true);
        setShowNewModal(false);
        setSubject('');
        setOrderId('');
        setMessage('');
        setNewAttachment(null);
      } else {
        toast.error(json.error || 'Gagal membuat tiket');
      }
    } catch {
      toast.error('Gagal membuat tiket');
    }
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() && !replyAttachment) return;
    if (!selectedTicket) return;

    setIsSendingReply(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText.trim(),
          attachments: replyAttachment ? [replyAttachment] : undefined,
          attachmentUrl: replyAttachment?.url || undefined,
          attachmentName: replyAttachment?.originalFilename || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Pesan terkirim!');
        setReplyText('');
        setReplyAttachment(null);

        // Refresh ticket thread
        const tRes = await fetch('/api/account/support');
        const tJson = await tRes.json();
        if (tJson.success) {
          setTickets(tJson.data);
        }
      } else {
        toast.error(json.error || 'Gagal mengirim balasan');
      }
    } catch {
      toast.error('Gagal mengirim balasan');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendReply();
    }
  };

  const renderAttachment = (url: string, name?: string) => {
    const isImage = /\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(url);
    if (isImage) {
      return (
        <div className="mt-2.5">
          <div
            onClick={() => setPreviewImage({ url, name })}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950/80 inline-block shadow-md"
          >
            <img
              src={url}
              alt={name || 'Lampiran Bukti'}
              className="max-h-48 max-w-full rounded-2xl object-cover transition duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-xs">
              <Maximize2 className="h-4 w-4" />
              <span>Perbesar Foto</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {name || 'Foto Lampiran'}
          </span>
        </div>
      );
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download={name}
        className="inline-flex items-center gap-2.5 mt-2.5 px-3.5 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/40 font-bold transition shadow-sm"
      >
        <FileText className="h-4 w-4 shrink-0 text-cyan-400" />
        <span className="truncate max-w-[200px]">{name || 'Lihat / Unduh Dokumen'}</span>
        <Download className="h-3.5 w-3.5 ml-1 text-slate-400 shrink-0" />
      </a>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Menunggu Respon</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>Sedang Diproses</span>
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>Selesai / Teratasi</span>
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
            <span>Ditutup</span>
          </span>
        );
      default:
        return (
          <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded-full">
            {status}
          </span>
        );
    }
  };

  // Filter and search logic
  const filteredTickets = tickets.filter((t) => {
    // Status filter
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

    // Category filter
    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = t.ticketNumber?.toLowerCase().includes(q);
      const matchSubject = t.subject?.toLowerCase().includes(q);
      const matchOrder = t.order?.orderNumber?.toLowerCase().includes(q);
      if (!matchNumber && !matchSubject && !matchOrder) return false;
    }

    return true;
  });

  // Ticket stats summary
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  // Pagination for left list
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Hero Card & Stats Bar */}
      <div className="rounded-3xl glass-panel border border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-cyan-950/20 p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-[11px]">
              <Headphones className="h-3.5 w-3.5" />
              <span>Layanan Pelanggan & Klaim Garansi 24/7</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Pusat Bantuan & Tiket CS</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Ajukan klaim replacement lisensi bermasalah, kendala login kredensial, atau pertanyaan pembayaran langsung ke tim teknis kami.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 px-4 py-2.5 text-xs font-bold transition shadow-sm"
              title="Sinkronisasi Pesan Tiket"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sinkronisasi...' : 'Sync Pesan'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs px-5 py-2.5 transition shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <Plus className="h-4 w-4 text-slate-950 stroke-[3]" />
              <span>Buat Tiket Baru</span>
            </button>
          </div>
        </div>

        {/* Quick Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-center text-slate-300 shrink-0">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Total Tiket</span>
              <span className="text-base font-extrabold text-white">{totalCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Menunggu Respon</span>
              <span className="text-base font-extrabold text-amber-400">{openCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Sedang Diproses</span>
              <span className="text-base font-extrabold text-cyan-400">{inProgressCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCheck className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-medium block">Selesai / Teratasi</span>
              <span className="text-base font-extrabold text-emerald-400">{resolvedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      {tickets.length === 0 ? (
        <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-12 text-center space-y-5 shadow-xl">
          <div className="h-20 w-20 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 mx-auto">
            <LifeBuoy className="h-10 w-10 text-cyan-400" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">Belum Ada Tiket Bantuan</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Mengalami masalah dengan akun, password, lisensi, atau pembayaran? Klik tombol di bawah untuk membuat tiket bantuan pertama Anda.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 font-extrabold text-xs text-slate-950 transition shadow-lg shadow-cyan-500/20"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Buat Tiket Bantuan Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Filterable Tickets List */}
          <div
            className={`lg:col-span-5 space-y-4 ${mobileShowChat ? 'hidden lg:block' : 'block'
              }`}
          >
            {/* Search and Filters Bar */}
            <div className="space-y-3 p-4 rounded-3xl glass-panel border border-slate-800/90 bg-slate-900/80 shadow-lg">
              {/* Search input */}
              <div className="relative">
                <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nomor tiket (#TKT-), subjek, pesanan..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { key: 'ALL', label: 'Semua', count: totalCount },
                  { key: 'OPEN', label: 'Menunggu', count: openCount },
                  { key: 'IN_PROGRESS', label: 'Diproses', count: inProgressCount },
                  { key: 'RESOLVED', label: 'Selesai', count: resolvedCount },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.key);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 text-[11px] ${statusFilter === tab.key
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${statusFilter === tab.key
                          ? 'bg-slate-950 text-cyan-400'
                          : 'bg-slate-800 text-slate-400'
                        }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tickets Cards List */}
            {paginatedTickets.length === 0 ? (
              <div className="rounded-3xl glass-panel border border-slate-800 p-8 text-center text-slate-400 text-xs space-y-2">
                <p className="font-bold text-white">Tidak ada tiket yang cocok</p>
                <p className="text-[11px]">Coba sesuaikan kata kunci pencarian atau filter status.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {paginatedTickets.map((t: any) => {
                  const isSelected = selectedTicket?.id === t.id;
                  const catConfig = CATEGORY_MAP[t.category] || CATEGORY_MAP.LAINNYA;
                  const CatIcon = catConfig.icon;
                  const lastMessage = t.messages?.[t.messages.length - 1];

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTicketId(t.id);
                        setMobileShowChat(true);
                      }}
                      className={`w-full text-left p-4 rounded-3xl border transition cursor-pointer space-y-3 relative group ${isSelected
                          ? 'border-cyan-500/60 bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/30 shadow-lg shadow-cyan-950/20'
                          : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700/80 hover:bg-slate-900/80'
                        }`}
                    >
                      {/* Top Header Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-xl border ${catConfig.bg}`}>
                            <CatIcon className={`h-3.5 w-3.5 ${catConfig.color}`} />
                          </div>
                          <span className="font-mono font-bold text-xs text-cyan-400">
                            {t.ticketNumber}
                          </span>
                        </div>
                        {getStatusBadge(t.status)}
                      </div>

                      {/* Subject */}
                      <div>
                        <h4 className="font-bold text-sm text-white line-clamp-1 group-hover:text-cyan-300 transition">
                          {t.subject}
                        </h4>
                        {lastMessage && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            <span className="text-slate-500">
                              {lastMessage.senderType === 'STAFF' ? 'CS: ' : 'Anda: '}
                            </span>
                            {lastMessage.message || (lastMessage.attachmentUrl ? '📎 Lampiran berkas' : '')}
                          </p>
                        )}
                      </div>

                      {/* Footer Row */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
                        <span>{catConfig.label}</span>
                        <span>{formatDateJakarta(t.updatedAt || t.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {filteredTickets.length > itemsPerPage && (
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
            )}
          </div>

          {/* Right Column: Ticket Conversation Thread Panel */}
          <div
            className={`lg:col-span-7 ${!mobileShowChat ? 'hidden lg:block' : 'block'
              }`}
          >
            {selectedTicket ? (
              <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden flex flex-col min-h-[620px]">
                {/* Conversation Header */}
                <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60 space-y-3">
                  {/* Mobile Back Button */}
                  <div className="flex items-center justify-between lg:hidden pb-1">
                    <button
                      type="button"
                      onClick={() => setMobileShowChat(false)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Kembali ke Daftar Tiket</span>
                    </button>
                    {getStatusBadge(selectedTicket.status)}
                  </div>

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-xl">
                          {selectedTicket.ticketNumber}
                        </span>
                        <div className="hidden lg:block">
                          {getStatusBadge(selectedTicket.status)}
                        </div>
                      </div>
                      <h2 className="text-lg font-black text-white leading-snug">
                        {selectedTicket.subject}
                      </h2>
                    </div>
                  </div>

                  {/* Metadata Chips Bar */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Kategori:</span>
                      <strong className="text-slate-200">
                        {CATEGORY_MAP[selectedTicket.category]?.label || selectedTicket.category}
                      </strong>
                    </div>

                    {selectedTicket.order && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Pesanan:</span>
                        <Link
                          href={`/account/orders`}
                          className="text-cyan-400 font-mono font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <span>{selectedTicket.order.orderNumber}</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Dibuat:</span>
                      <span className="text-slate-300 font-medium">
                        {formatDateJakarta(selectedTicket.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Messages Thread Container */}
                <div className="flex-1 p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[460px] bg-slate-950/40">
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((m: any) => {
                      const isStaff = m.senderType === 'STAFF';
                      return (
                        <div
                          key={m.id}
                          className={`flex gap-3 max-w-[90%] sm:max-w-[80%] ${isStaff ? 'mr-auto' : 'ml-auto flex-row-reverse'
                            }`}
                        >
                          {/* Avatar */}
                          <div
                            className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-md ${isStaff
                                ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950'
                                : 'bg-slate-800 text-slate-200 border border-slate-700'
                              }`}
                          >
                            {isStaff ? <Headphones className="h-4 w-4" /> : 'You'}
                          </div>

                          {/* Bubble content */}
                          <div className={`space-y-1 ${isStaff ? 'text-left' : 'text-right'}`}>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              {isStaff ? (
                                <span className="font-extrabold text-cyan-400 flex items-center gap-1">
                                  <span>CS Support Gogomi</span>
                                  <CheckCircle2 className="h-3 w-3 text-cyan-400" />
                                </span>
                              ) : (
                                <span className="font-bold text-slate-300">Anda (Member)</span>
                              )}
                              <span>•</span>
                              <span>{formatDateJakarta(m.createdAt)}</span>
                            </div>

                            <div
                              className={`p-4 rounded-3xl text-xs leading-relaxed shadow-lg text-left ${isStaff
                                  ? 'bg-slate-900 border border-cyan-500/30 text-slate-100 rounded-tl-xs shadow-cyan-950/10'
                                  : 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-tr-xs font-medium'
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
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16 text-slate-500 text-xs space-y-2">
                      <MessageSquare className="h-8 w-8 text-slate-700 mx-auto" />
                      <p>Belum ada percakapan pada tiket ini.</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Form Footer */}
                {selectedTicket.status !== 'CLOSED' ? (
                  <form
                    onSubmit={handleSendReply}
                    className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 space-y-3"
                  >
                    {/* Attachment preview badge if selected */}
                    {replyAttachment && (
                      <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-1.5 rounded-2xl text-cyan-300 text-xs w-fit">
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

                    <div className="flex items-end gap-2.5">
                      <div className="flex-1 relative">
                        <textarea
                          rows={2}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Tulis balasan... (Tekan Ctrl+Enter atau Cmd+Enter untuk kirim)"
                          className="w-full rounded-2xl bg-slate-900 border border-slate-800 p-3.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition resize-none"
                        />
                      </div>

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
                        className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition shrink-0"
                        title="Lampirkan File / Foto Bukti"
                      >
                        <Paperclip className={`h-4 w-4 ${isUploadingReply ? 'animate-bounce text-cyan-400' : ''}`} />
                      </button>

                      <button
                        type="submit"
                        disabled={isSendingReply || (!replyText.trim() && !replyAttachment)}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs px-5 py-3.5 transition shadow-lg shadow-cyan-500/20 disabled:opacity-50 shrink-0"
                      >
                        <Send className="h-4 w-4 stroke-[2.5]" />
                        <span className="hidden sm:inline">
                          {isSendingReply ? 'Mengirim...' : 'Kirim'}
                        </span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-5 border-t border-slate-800 bg-slate-950/80 text-center space-y-2">
                    <p className="text-xs text-slate-400">
                      Tiket ini telah ditutup oleh Customer Support.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowNewModal(true)}
                      className="text-xs font-bold text-cyan-400 hover:underline"
                    >
                      Buka Tiket Baru Jika Masih Ada Kendala &rarr;
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl glass-panel border border-slate-800 p-16 text-center text-slate-400 text-xs space-y-3">
                <MessageSquare className="h-10 w-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">Pilih Tiket Percakapan</h3>
                <p className="text-[11px] text-slate-500">
                  Pilih salah satu tiket di sebelah kiri untuk melihat balasan dari tim Customer Support kami.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Ticket Modal Backdrop */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 md:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <LifeBuoy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Buat Tiket Bantuan Baru</h3>
                  <p className="text-xs text-slate-400">
                    Sampaikan kendala akun atau transaksi Anda untuk penanganan cepat.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              {/* Category selector grid */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-bold">Kategori Kendala *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Object.entries(CATEGORY_MAP).map(([key, item]) => {
                    const Icon = item.icon;
                    const isSelected = category === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCategory(key)}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 ${isSelected
                            ? 'border-cyan-500 bg-cyan-500/10 shadow-md shadow-cyan-950/20'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                          }`}
                      >
                        <Icon className={`h-4 w-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <span className={`font-bold text-[11px] ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Connected order dropdown */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-bold">
                  Terhubung Dengan Pesanan (Opsional)
                </label>
                <select
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-white focus:border-cyan-500 focus:outline-none transition"
                >
                  <option value="">-- Tanpa Pesanan Spesifik --</option>
                  {userOrders &&
                    userOrders.map((o: any) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} {o.items?.[0]?.productName ? `(${o.items[0].productName})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-bold">Subjek Kendala *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Password Akun ChatGPT Plus Salah / Garansi Expired"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition"
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-bold">
                  Penjelasan Detail Kendala *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Jelaskan kendala secara rinci (misal: pesan error saat login, kapan mulai bermasalah) agar tim CS dapat langsung memberikan solusi penggantian lisensi..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition resize-none"
                />
              </div>

              {/* Attachment */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-bold">
                  Lampirkan Bukti Foto / Tangkapan Layar (Opsional)
                </label>
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
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/40 transition font-bold"
                  >
                    <Paperclip className="h-4 w-4 text-cyan-400" />
                    <span>{isUploadingNew ? 'Mengunggah ke Cloudinary...' : 'Pilih File / Screenshot'}</span>
                  </button>

                  {newAttachment && (
                    <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-1.5 rounded-2xl text-cyan-300">
                      <FileText className="h-4 w-4" />
                      <span className="truncate max-w-[180px] font-bold">{newAttachment.originalFilename}</span>
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

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-800 text-slate-300 hover:text-white font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black transition shadow-lg shadow-cyan-500/20"
                >
                  Kirim Tiket Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-150 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl relative"
          >
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-300 font-bold truncate">
                {previewImage.name || 'Lampiran Gambar'}
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center">
              <img
                src={previewImage.url}
                alt={previewImage.name || 'Pratinjau Foto'}
                className="max-h-[70vh] max-w-full rounded-2xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
