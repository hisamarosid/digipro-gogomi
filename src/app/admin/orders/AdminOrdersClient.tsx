'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import {
    ShoppingBag,
    Search,
    Eye,
    CheckCircle2,
    Clock,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Zap,
    EyeOff,
    Copy,
    User,
    Package,
    CreditCard,
    X,
    ExternalLink,
    ShieldCheck,
    MessageCircle,
    Mail,
    PackageCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/Pagination';

interface AdminOrdersClientProps {
    orders: any[];
}

export function AdminOrdersClient({ orders: initialOrders }: AdminOrdersClientProps) {
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get('search') || searchParams.get('q') || '';
    const initialId = searchParams.get('id');

    const [orders, setOrders] = useState<any[]>(initialOrders);
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [selectedStatus, setSelectedStatus] = useState('ALL');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(() => {
        if (initialId) {
            return initialOrders.find((o) => o.id === initialId || o.orderNumber === initialId) || null;
        }
        return null;
    });
    const [showPayloads, setShowPayloads] = useState<Record<string, boolean>>({});
    const [isProcessing, setIsProcessing] = useState(false);

    // Metrics calculation
    const totalCount = orders.length;
    const pendingCount = orders.filter((o) => o.status === 'PENDING_PAYMENT').length;
    const needsFulfillmentCount = orders.filter((o) => o.status === 'NEEDS_FULFILLMENT' || o.status === 'PROCESSING').length;
    const completedCount = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'PAID').length;

    const totalRevenue = orders
        .filter((o) => o.status === 'COMPLETED' || o.status === 'PAID')
        .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    const filteredOrders = orders.filter((o) => {
        const customerName = o.user?.name || o.guestName || '';
        const customerEmail = o.user?.email || o.guestEmail || '';
        const orderNum = o.orderNumber || '';

        const itemMatch = o.items?.some(
            (item: any) =>
                (item.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.variantName || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

        const matchesSearch =
            orderNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            itemMatch;

        if (!matchesSearch) return false;

        switch (selectedStatus) {
            case 'PENDING_PAYMENT':
                return o.status === 'PENDING_PAYMENT';
            case 'NEEDS_FULFILLMENT':
                return o.status === 'NEEDS_FULFILLMENT' || o.status === 'PROCESSING';
            case 'PAID':
                return o.status === 'PAID';
            case 'COMPLETED':
                return o.status === 'COMPLETED';
            case 'CANCELLED_EXPIRED':
                return o.status === 'CANCELLED' || o.status === 'EXPIRED';
            default:
                return true;
        }
    });

    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const togglePayload = (id: string) => {
        setShowPayloads((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Kredensial berhasil disalin!');
    };

    const [diagData, setDiagData] = useState<any | null>(null);
    const [diagModalOpen, setDiagModalOpen] = useState(false);

    const handleTriggerFulfillment = async (orderId: string) => {
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/admin/orders/${orderId}/retry-fulfillment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const json = await res.json();
            if (res.ok && json.success) {
                toast.success(json.message || 'Fulfillment berhasil diproses!');
                if (json.data) {
                    setOrders((prev) => prev.map((o) => (o.id === orderId ? json.data : o)));
                    if (selectedOrder?.id === orderId) {
                        setSelectedOrder(json.data);
                    }
                }
            } else {
                toast.error(json.message || json.error || 'Gagal memproses fulfillment');
                if (json.data?.order) {
                    setOrders((prev) => prev.map((o) => (o.id === orderId ? json.data.order : o)));
                    if (selectedOrder?.id === orderId) {
                        setSelectedOrder(json.data.order);
                    }
                }
            }
        } catch {
            toast.error('Terjadi kesalahan jaringan');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOpenDiagnostic = async (variantId: string) => {
        try {
            const res = await fetch(`/api/admin/shared-accounts/diagnostics?variantId=${variantId}`);
            const json = await res.json();
            if (res.ok && json.success) {
                setDiagData(json.data);
                setDiagModalOpen(true);
            } else {
                toast.error(json.error || 'Gagal memuat diagnosa stok');
            }
        } catch {
            toast.error('Terjadi kesalahan jaringan saat memuat diagnosa');
        }
    };

    const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/admin/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            const json = await res.json();
            if (res.ok && json.success) {
                toast.success(`Status pesanan berhasil diubah menjadi ${newStatus}!`);
                if (json.data) {
                    setOrders((prev) => prev.map((o) => (o.id === orderId ? json.data : o)));
                    if (selectedOrder?.id === orderId) {
                        setSelectedOrder(json.data);
                    }
                }
            } else {
                toast.error(json.error || 'Gagal mengubah status');
            }
        } catch {
            toast.error('Terjadi kesalahan jaringan');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSimulatePayment = async (orderNumber: string) => {
        setIsProcessing(true);
        try {
            const res = await fetch('/api/dev/simulate-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderNumber }),
            });
            const json = await res.json();
            if (json.success) {
                toast.success('⚡ [DEV TEST] Order berhasil diubah menjadi LUNAS dan inventaris terkirim!');
                window.location.reload();
            } else {
                toast.error(json.error || 'Gagal mensimulasikan pembayaran');
            }
        } catch {
            toast.error('Terjadi kesalahan koneksi');
        } finally {
            setIsProcessing(false);
        }
    };

    const confirmStatusChange = (ord: any, status: string, message: string) => {
        if (window.confirm(`Pesanan #${ord.orderNumber}\n\n${message}`)) {
            handleUpdateOrderStatus(ord.id, status);
        }
    };

    /** WhatsApp link when a phone number is known, otherwise a mailto link; null when neither exists. */
    const getContactLink = (ord: any): { href: string; label: string; kind: 'wa' | 'mail' } | null => {
        const rawPhone: string = ord.user?.phone || ord.guestPhone || '';
        const digits = rawPhone.replace(/\D/g, '');
        if (digits.length >= 8) {
            const intl = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
            const text = encodeURIComponent(`Halo, terkait pesanan #${ord.orderNumber} di Gogomi Store.`);
            return { href: `https://wa.me/${intl}?text=${text}`, label: 'Hubungi via WhatsApp', kind: 'wa' };
        }
        const email = ord.user?.email || ord.guestEmail;
        if (email) {
            const subject = encodeURIComponent(`Pesanan #${ord.orderNumber} - Gogomi Store`);
            return { href: `mailto:${email}?subject=${subject}`, label: 'Kirim email ke pelanggan', kind: 'mail' };
        }
        return null;
    };

    return (
        <div className="space-y-6">

            {/* Header Banner */}
            <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                            <ShoppingBag className="h-3.5 w-3.5" />
                            <span>Order Fulfillment &amp; Transaction Center</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                            Manajemen Pesanan Digital
                        </h1>
                        <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
                            Pantau transaksi masuk secara real-time, verifikasi auto-settlement pembayaran QRIS, eksekusi alokasi stok FEFO, dan lihat audit pengiriman.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Link
                            href="/admin/operations/fulfillment"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition"
                        >
                            <Zap className="h-4 w-4" />
                            <span>Operations Queue</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* METRIC SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 uppercase font-bold block">Total Pesanan</span>
                    <span className="text-2xl font-black text-white">{totalCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-1">
                    <span className="text-[11px] text-amber-400 uppercase font-bold block">Pending Payment</span>
                    <span className="text-2xl font-black text-amber-300">{pendingCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-1">
                    <span className="text-[11px] text-cyan-400 uppercase font-bold block">Needs Fulfillment</span>
                    <span className="text-2xl font-black text-cyan-300">{needsFulfillmentCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                    <span className="text-[11px] text-emerald-400 uppercase font-bold block">Completed / Lunas</span>
                    <span className="text-2xl font-black text-emerald-300">{completedCount}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1 col-span-2 md:col-span-1">
                    <span className="text-[11px] text-slate-400 uppercase font-bold block">Gross Revenue</span>
                    <span className="text-2xl font-black text-cyan-400 font-mono">{formatIDR(totalRevenue)}</span>
                </div>
            </div>

            {/* FILTER & SEARCH BAR */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 glass-panel p-4 rounded-3xl border border-slate-800 bg-slate-900/60">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Cari No. Order (#ORD-...), nama, email..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                </div>

                {/* Status Filter Tabs */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                    {[
                        { id: 'ALL', label: 'Semua' },
                        { id: 'PENDING_PAYMENT', label: `Pending (${pendingCount})` },
                        { id: 'NEEDS_FULFILLMENT', label: `Needs Stock (${needsFulfillmentCount})` },
                        { id: 'PAID', label: 'Paid' },
                        { id: 'COMPLETED', label: `Completed (${completedCount})` },
                        { id: 'CANCELLED_EXPIRED', label: 'Batal / Expired' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setSelectedStatus(tab.id);
                                setCurrentPage(1);
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold transition text-[11px] ${selectedStatus === tab.id
                                ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ORDERS TABLE */}
            <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                {filteredOrders.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-8">Tidak ada pesanan yang sesuai filter.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                            <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500 font-bold">
                                <tr>
                                    <th className="py-3 px-3">No. Order</th>
                                    <th className="py-3 px-3">Pelanggan</th>
                                    <th className="py-3 px-3">Item Produk Digital</th>
                                    <th className="py-3 px-3">Total Bayar</th>
                                    <th className="py-3 px-3">Status Order</th>
                                    <th className="py-3 px-3">Tgl Transaksi</th>
                                    <th className="py-3 px-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {paginatedOrders.map((ord) => {
                                    const customerName = ord.user?.name || ord.guestName || 'Guest';
                                    const customerEmail = ord.user?.email || ord.guestEmail || '-';

                                    return (
                                        <tr key={ord.id} className="hover:bg-slate-800/30 transition">

                                            {/* Order Number */}
                                            <td className="py-3 px-3">
                                                <button
                                                    onClick={() => setSelectedOrder(ord)}
                                                    className="font-mono font-bold text-cyan-400 hover:underline text-xs bg-slate-950 px-2 py-1 rounded border border-slate-800 block w-fit"
                                                >
                                                    {ord.orderNumber}
                                                </button>
                                            </td>

                                            {/* Customer */}
                                            <td className="py-3 px-3">
                                                <p className="font-bold text-white text-xs leading-tight">{customerName}</p>
                                                <p className="font-mono text-[10px] text-blue-600 dark:text-cyan-400 leading-tight">{customerEmail}</p>
                                            </td>

                                            {/* Items */}
                                            <td className="py-3 px-3">
                                                <div className="space-y-0.5">
                                                    {ord.items?.map((item: any) => (
                                                        <p key={item.id} className="text-xs text-slate-300 font-medium line-clamp-1">
                                                            {item.productName} ({item.variantName}) x{item.quantity}
                                                        </p>
                                                    ))}
                                                </div>
                                            </td>

                                            {/* Total */}
                                            <td className="py-3 px-3 font-mono font-bold text-xs text-white">
                                                {formatIDR(ord.grandTotal)}
                                            </td>

                                            {/* Status */}
                                            <td className="py-3 px-3">
                                                <span
                                                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${ord.status === 'COMPLETED' || ord.status === 'PAID'
                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                        : ord.status === 'NEEDS_FULFILLMENT'
                                                            ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 animate-pulse'
                                                            : ord.status === 'PENDING_PAYMENT'
                                                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                                        }`}
                                                >
                                                    {ord.status}
                                                </span>
                                            </td>

                                            {/* Date */}
                                            <td className="py-3 px-3 text-[11px] text-slate-400">
                                                {formatDateJakarta(ord.createdAt)}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-3 text-right">
                                                {(() => {
                                                    const contact = getContactLink(ord);
                                                    const canFulfill = ['PAID', 'PROCESSING', 'NEEDS_FULFILLMENT'].includes(ord.status);
                                                    return (
                                                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                                                            {ord.status === 'PENDING_PAYMENT' && (
                                                                <>
                                                                    <button
                                                                        onClick={() =>
                                                                            confirmStatusChange(
                                                                                ord,
                                                                                'PAID',
                                                                                'Tandai pesanan ini sudah DIBAYAR?\nStok akan langsung dialokasikan dan dikirim ke pelanggan.'
                                                                            )
                                                                        }
                                                                        disabled={isProcessing}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition disabled:opacity-50"
                                                                        title="Tandai sudah dibayar & kirim"
                                                                    >
                                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                                        <span>Tandai Lunas</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            confirmStatusChange(
                                                                                ord,
                                                                                'CANCELLED',
                                                                                'Batalkan pesanan ini?\nKupon, koin, dan reservasi stok akan dikembalikan.'
                                                                            )
                                                                        }
                                                                        disabled={isProcessing}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-[11px] font-bold transition disabled:opacity-50"
                                                                        title="Batalkan pesanan"
                                                                    >
                                                                        <XCircle className="h-3.5 w-3.5" />
                                                                        <span>Batalkan</span>
                                                                    </button>
                                                                </>
                                                            )}

                                                            {canFulfill && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleTriggerFulfillment(ord.id)}
                                                                        disabled={isProcessing}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition disabled:opacity-50"
                                                                        title="Proses / Retry Fulfillment (otomatis)"
                                                                    >
                                                                        <Zap className="h-3.5 w-3.5" />
                                                                        <span>Proses</span>
                                                                    </button>
                                                                    <Link
                                                                        href={`/admin/orders/${ord.id}`}
                                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-[11px] font-bold transition"
                                                                        title="Kirim kredensial secara manual"
                                                                    >
                                                                        <PackageCheck className="h-3.5 w-3.5" />
                                                                        <span>Kirim Manual</span>
                                                                    </Link>
                                                                </>
                                                            )}

                                                            {contact && (
                                                                <a
                                                                    href={contact.href}
                                                                    target={contact.kind === 'wa' ? '_blank' : undefined}
                                                                    rel="noopener noreferrer"
                                                                    className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 hover:text-emerald-300 transition"
                                                                    title={contact.label}
                                                                >
                                                                    {contact.kind === 'wa' ? <MessageCircle className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                                                                </a>
                                                            )}

                                                            <button
                                                                onClick={() => setSelectedOrder(ord)}
                                                                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
                                                                title="Lihat ringkasan (popup)"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </button>
                                                            <Link
                                                                href={`/admin/orders/${ord.id}`}
                                                                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
                                                                title="Buka halaman detail lengkap"
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </Link>
                                                        </div>
                                                    );
                                                })()}
                                            </td>

                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredOrders.length / itemsPerPage)}
                    totalItems={filteredOrders.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(val) => {
                        setItemsPerPage(val);
                        setCurrentPage(1);
                    }}
                />
            </div>

            {/* RICH ORDER DETAIL MODAL */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">

                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <ShoppingBag className="h-5 w-5 text-cyan-400" />
                                <div>
                                    <h3 className="text-base font-extrabold text-white">Detail Pesanan #{selectedOrder.orderNumber}</h3>
                                    <p className="text-[11px] text-slate-400">{formatDateJakarta(selectedOrder.createdAt)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Customer Details */}
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                            <span className="text-[10px] text-blue-400 uppercase font-extrabold flex items-center gap-1">
                                <User className="h-3.5 w-3.5" /> Informasi Pelanggan (Customer)
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Nama:</span>
                                    <span className="font-bold text-white">{selectedOrder.user?.name || selectedOrder.guestName || 'Guest'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Email:</span>
                                    <span className="font-mono font-bold text-cyan-400">{selectedOrder.user?.email || selectedOrder.guestEmail || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Tipe Akun:</span>
                                    <span className="font-bold text-emerald-400">{selectedOrder.userId ? 'Member Terdaftar' : 'Guest Checkout'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Order Items & Credentials Snapshot */}
                        <div className="space-y-3 text-xs">
                            <span className="text-[10px] text-slate-400 uppercase font-extrabold flex items-center gap-1">
                                <Package className="h-3.5 w-3.5 text-emerald-400" /> Rincian Item Produk & Kredensial Terkirim
                            </span>

                            <div className="space-y-3">
                                {selectedOrder.items?.map((item: any) => {
                                    const fulfillment = item.fulfillments?.[0];
                                    const hasPayload = fulfillment?.payloadRevealed;

                                    return (
                                        <div key={item.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-white text-sm">{item.productName}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs text-cyan-400 font-mono">{item.variantName} (x{item.quantity})</p>
                                                        <span className="text-[9px] font-extrabold uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                                            {item.deliveryModelSnapshot || item.variant?.deliveryModel || 'DEDICATED'}
                                                        </span>
                                                    </div>

                                                    {(item.deliveryModelSnapshot === 'SHARED_ACCOUNT' || item.variant?.deliveryModel === 'SHARED_ACCOUNT') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenDiagnostic(item.variantId)}
                                                            className="mt-1 flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:underline bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg"
                                                        >
                                                            <span>🔍 Diagnostics & Candidate Analysis</span>
                                                        </button>
                                                    )}
                                                </div>
                                                <span className="font-extrabold text-blue-600 dark:text-cyan-400 text-sm">
                                                    {formatIDR(item.subtotal)}
                                                </span>
                                            </div>

                                            {/* Delivered Credential Snapshot */}
                                            {fulfillment && (
                                                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                                                    <div className="flex items-center justify-between text-[11px]">
                                                        <span className="text-slate-400 font-medium">Status Delivery & Payload:</span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${fulfillment.status === 'ACTIVE'
                                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                            : 'bg-slate-800 text-slate-400'
                                                            }`}>
                                                            {fulfillment.status} ({fulfillment.deliveryType})
                                                        </span>
                                                    </div>

                                                    {hasPayload && (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] text-slate-500">Payload Terenkripsi Terkirim:</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => togglePayload(item.id)}
                                                                    className="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
                                                                >
                                                                    {showPayloads[item.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                                    <span>{showPayloads[item.id] ? 'Sembunyikan' : 'Lihat Payload'}</span>
                                                                </button>
                                                            </div>

                                                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-300 break-all select-all flex items-center justify-between">
                                                                <span>{showPayloads[item.id] ? fulfillment.payloadRevealed : '••••••••••••••••••••••••••••••••'}</span>
                                                                {showPayloads[item.id] && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCopy(fulfillment.payloadRevealed)}
                                                                        className="ml-2 text-slate-400 hover:text-white p-1"
                                                                        title="Salin"
                                                                    >
                                                                        <Copy className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Payment Info */}
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                            <span className="text-[10px] text-amber-400 uppercase font-extrabold flex items-center gap-1">
                                <CreditCard className="h-3.5 w-3.5" /> Informasi Pembayaran & QRIS Gateway
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Total Tagihan:</span>
                                    <span className="font-black text-emerald-400 text-sm">{formatIDR(selectedOrder.grandTotal)}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Payment Provider:</span>
                                    <span className="font-bold text-white">AutoGoPay QRIS Instant</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Status Pembayaran:</span>
                                    <span className="font-bold text-cyan-400 uppercase">{selectedOrder.paymentStatus || selectedOrder.status}</span>
                                </div>
                            </div>
                        </div>

                        {/* Admin Actions */}
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                            <span className="text-[10px] text-cyan-400 uppercase font-extrabold block">KONTROL AKSI ADMIN</span>

                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    disabled={isProcessing}
                                    onClick={() => handleTriggerFulfillment(selectedOrder.id)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition disabled:opacity-50"
                                >
                                    <Zap className="h-4 w-4" />
                                    <span>⚡ Proses / Retry Fulfillment (FEFO)</span>
                                </button>

                                <div className="flex items-center gap-2 ml-auto">
                                    <span className="text-slate-400 text-[11px] font-medium">Ubah Status:</span>
                                    <select
                                        value={selectedOrder.status}
                                        disabled={isProcessing}
                                        onChange={(e) =>
                                            confirmStatusChange(
                                                selectedOrder,
                                                e.target.value,
                                                `Ubah status dari ${selectedOrder.status} menjadi ${e.target.value}?`
                                            )
                                        }
                                        className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs font-bold text-white focus:border-cyan-500"
                                    >
                                        <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                                        <option value="PAID">PAID</option>
                                        <option value="NEEDS_FULFILLMENT">NEEDS_FULFILLMENT</option>
                                        <option value="COMPLETED">COMPLETED</option>
                                        <option value="CANCELLED">CANCELLED</option>
                                        <option value="EXPIRED">EXPIRED</option>
                                    </select>
                                </div>
                            </div>

                            {process.env.NODE_ENV !== 'production' && selectedOrder.status === 'PENDING_PAYMENT' && (
                                <div className="pt-2 border-t border-slate-800">
                                    <button
                                        disabled={isProcessing}
                                        onClick={() => handleSimulatePayment(selectedOrder.orderNumber)}
                                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 font-extrabold text-white text-xs shadow-md shadow-blue-500/20"
                                    >
                                        ⚡ Simulasikan Pembayaran Lunas (Dev Test Mode)
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 pt-2">
                            <Link
                                href={`/admin/orders/${selectedOrder.id}`}
                                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 hover:text-cyan-300 font-bold text-xs"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Buka Halaman Lengkap</span>
                            </Link>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs"
                            >
                                Tutup Modal
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* Shared Stock Diagnostic Modal */}
            {diagModalOpen && diagData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 overflow-y-auto">
                    <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 text-white max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="font-black text-base flex items-center gap-2 text-amber-400">
                                    <ShieldCheck className="h-5 w-5" />
                                    <span>FULFILLMENT DIAGNOSTICS & CANDIDATE ANALYSIS</span>
                                </h3>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">
                                    Variant: {diagData.productName} — {diagData.variantName} ({diagData.sku})
                                </p>
                            </div>
                            <button
                                onClick={() => setDiagModalOpen(false)}
                                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Diagnostic Metrics Overview */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Total Accounts</span>
                                <p className="text-lg font-black text-white">{diagData.accountsFound}</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Total Slots</span>
                                <p className="text-lg font-black text-white">{diagData.totalSlots}</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Available Slots</span>
                                <p className="text-lg font-black text-cyan-400">{diagData.availableSlots}</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Eligible Slots Right Now</span>
                                <p className={`text-lg font-black ${diagData.eligibleSlots > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {diagData.eligibleSlots}
                                </p>
                            </div>
                        </div>

                        {/* Configured Lifetime Requirements */}
                        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1 text-blue-300">
                            <div className="font-bold text-blue-400 flex items-center gap-1.5">
                                <Clock className="h-4 w-4" /> Requirement Verification Rules:
                            </div>
                            <p>• Required Subscription Days: <span className="font-bold text-white">{diagData.subscriptionDays} hari</span></p>
                            <p>• Safety Buffer: <span className="font-bold text-white">{diagData.safetyBufferDays} hari</span></p>
                            <p>• Required Remaining Master Lifetime: <span className="font-bold text-white">≥ {diagData.requiredRemainingDays} hari</span></p>
                        </div>

                        {/* Candidates Analysis */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Analisis Kandidat Shared Accounts:</h4>

                            {diagData.candidates?.length === 0 ? (
                                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-xs text-rose-300">
                                    <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-rose-400" />
                                    <span>Tidak ada SharedAccount yang terhubung ke ProductVariant ini (NO_SHARED_ACCOUNT / VARIANT_MISMATCH).</span>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {diagData.candidates.map((c: any) => (
                                        <div
                                            key={c.accountId}
                                            className={`p-3 rounded-2xl border text-xs space-y-1.5 ${c.eligible
                                                ? 'bg-emerald-950/20 border-emerald-500/30'
                                                : 'bg-rose-950/20 border-rose-500/30'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between font-bold">
                                                <span className="text-white flex items-center gap-2">
                                                    <span>Account Label: {c.label}</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                                                        Status: {c.status}
                                                    </span>
                                                </span>
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-extrabold border ${c.eligible
                                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                                        }`}
                                                >
                                                    {c.eligible ? 'ELIGIBLE' : `REJECTED: ${c.rejectionReason}`}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-400">
                                                <div>Available Slots: <span className="font-bold text-white">{c.availableSlotsCount} / {c.totalSlots}</span></div>
                                                <div>Assigned Slots: <span className="font-bold text-white">{c.assignedSlotsCount}</span></div>
                                                <div>Master Expire: <span className="font-bold text-white">{c.masterExpiresAt ? formatDateJakarta(c.masterExpiresAt) : 'No Expiry'}</span></div>
                                            </div>

                                            {!c.eligible && (
                                                <div className="text-[11px] text-rose-400 font-medium pt-1 border-t border-rose-500/20 flex items-center gap-1">
                                                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                                                    <span>Alasan Penolakan: {c.rejectionMessage}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setDiagModalOpen(false)}
                                className="px-5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs"
                            >
                                Tutup Diagnosa
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
