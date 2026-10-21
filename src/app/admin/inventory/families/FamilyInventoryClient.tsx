'use client';

import React, { useState, useEffect } from 'react';
import { formatRevealedPayload } from '@/lib/security/encryption';
import { FormattedCredentialView, extractFirstUrl } from '@/components/common/FormattedCredentialView';
import {
  Users,
  Plus,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Lock,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Truck,
  DollarSign,
  Eye,
  EyeOff,
  Copy,
  Edit2,
  Trash2,
  X,
  Mail,
  UserCheck,
  UserPlus,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateJakarta, formatIDR } from '@/lib/utils/formatters';
import { Pagination } from '@/components/ui/Pagination';
import { VerificationAccessConfigSection, VerificationAccessState } from '@/components/admin/VerificationAccessConfigSection';

interface FamilyInventoryClientProps {
  initialGroups: any[];
  familyVariants: any[];
  suppliers?: any[];
}

export function FamilyInventoryClient({
  initialGroups,
  familyVariants,
  suppliers = [],
}: FamilyInventoryClientProps) {
  const [groups, setGroups] = useState<any[]>(initialGroups);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modal State: Add Family Group
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [variantId, setVariantId] = useState(familyVariants[0]?.id || '');
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [supplierReference, setSupplierReference] = useState('');
  const [groupReference, setGroupReference] = useState('');
  const [ownerCredentialPlain, setOwnerCredentialPlain] = useState('');
  const [maxMembers, setMaxMembers] = useState('5');
  const [acquisitionCost, setAcquisitionCost] = useState('150000');
  const [masterExpiresAt, setMasterExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [verificationConfig, setVerificationConfig] = useState<VerificationAccessState>({
    verificationRequired: false,
    verificationMethod: 'NONE',
    verificationEmail: '',
    verificationAccessUrl: '',
    verificationMailboxId: '',
    verificationProvider: 'GENERIC',
    verificationInstructions: '',
  });

  // Modal State: Reveal Owner Credential
  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const [revealedCred, setRevealedCred] = useState<string>('');
  const [revealedGroup, setRevealedGroup] = useState<any | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  // Modal State: Edit Family Group
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [editGroupRef, setEditGroupRef] = useState('');
  const [editOwnerCred, setEditOwnerCred] = useState('');
  const [editStatus, setEditStatus] = useState('AVAILABLE');
  const [editSupplierId, setEditSupplierId] = useState('');
  const [editSupplierRef, setEditSupplierRef] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editVerificationConfig, setEditVerificationConfig] = useState<VerificationAccessState>({
    verificationRequired: false,
    verificationMethod: 'NONE',
    verificationEmail: '',
    verificationAccessUrl: '',
    verificationMailboxId: '',
    verificationProvider: 'GENERIC',
    verificationInstructions: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Modal State: Rotate Owner Credential & Release Member Slots
  const [rotateModalOpen, setRotateModalOpen] = useState(false);
  const [rotatingGroup, setRotatingGroup] = useState<any | null>(null);
  const [newOwnerCred, setNewOwnerCred] = useState('');
  const [selectedMemberIdsToRelease, setSelectedMemberIdsToRelease] = useState<string[]>([]);
  const [isRotatingCredential, setIsRotatingCredential] = useState(false);

  // Modal State: Invalidate Family Group & Mass Replace
  const [invalidatingGroupId, setInvalidatingGroupId] = useState<string | null>(null);
  const [isInvalidating, setIsInvalidating] = useState(false);

  const handleInvalidateGroup = async (grpId: string) => {
    setIsInvalidating(true);
    try {
      const res = await fetch(`/api/admin/family-groups/${grpId}/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'FAMILY_GROUP_INVALID' }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message);
        setGroups((prev) =>
          prev.map((g) => (g.id === grpId ? { ...g, status: 'INVALID' } : g))
        );
        setInvalidatingGroupId(null);
      } else {
        toast.error(json.error || 'Gagal menonaktifkan Family Group');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsInvalidating(false);
    }
  };

  const openRotateModal = (grp: any) => {
    setRotatingGroup(grp);
    setNewOwnerCred('');
    const now = new Date();
    const expiredMemberIds = grp.members
      ?.filter((m: any) => m.status === 'EXPIRED' || (m.expiresAt && new Date(m.expiresAt) <= now))
      .map((m: any) => m.id) || [];
    setSelectedMemberIdsToRelease(expiredMemberIds.length > 0 ? expiredMemberIds : grp.members?.map((m: any) => m.id) || []);
    setRotateModalOpen(true);
  };

  const handleExecuteRotateCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotatingGroup || !newOwnerCred.trim()) {
      toast.error('Owner Kredensial / Link baru wajib diisi');
      return;
    }

    setIsRotatingCredential(true);
    try {
      const res = await fetch(`/api/admin/family-groups/${rotatingGroup.id}/rotate-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerCredentialPlain: newOwnerCred.trim(),
          releaseSlotIds: selectedMemberIdsToRelease,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message || 'Owner Kredensial berhasil diperbarui & member slot telah dirilis!');
        setGroups((prev) => prev.map((g) => (g.id === rotatingGroup.id ? json.data : g)));
        setRotateModalOpen(false);
      } else {
        toast.error(json.error || 'Gagal merotasi kredensial');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsRotatingCredential(false);
    }
  };

  // Auto-generate sequential group reference (e.g. FAM-SPT-001)
  const generateAutoGroupRef = (vId: string) => {
    const selectedVariant = familyVariants.find((v) => v.id === vId);
    if (!selectedVariant) return 'FAM-001';
    const prefix = selectedVariant.sku ? `FAM-${selectedVariant.sku.toUpperCase()}` : 'FAM-GRP';
    const existingCount = groups.filter((g) => g.productVariantId === vId).length;
    const nextNum = (existingCount + 1).toString().padStart(3, '0');
    return `${prefix}-${nextNum}`;
  };

  useEffect(() => {
    if (addModalOpen && variantId) {
      setGroupReference(generateAutoGroupRef(variantId));
    }
  }, [addModalOpen, variantId]);

  // Metrics Calculations
  const totalGroups = groups.length;
  let totalSlots = 0;
  let occupiedSlots = 0;
  let availableSlots = 0;
  let totalCostStored = 0;

  groups.forEach((grp) => {
    totalSlots += grp.maxMembers || 0;
    const assigned = grp.members?.filter((m: any) => m.status === 'ASSIGNED').length || 0;
    occupiedSlots += assigned;
    availableSlots += (grp.maxMembers || 0) - assigned;
    totalCostStored += grp.acquisitionCost || 0;
  });

  const memberFillRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantId || !groupReference) {
      toast.error('Harap isi semua field wajib');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/family-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productVariantId: variantId,
          groupReference,
          ownerCredentialPlain: ownerCredentialPlain.trim() || undefined,
          maxMembers: Number(maxMembers) || 5,
          acquisitionCost: Number(acquisitionCost) || 0,
          masterExpiresAt: masterExpiresAt || null,
          supplierId: selectedSupplierId || null,
          supplierReference: supplierReference.trim() || null,
          verificationRequired: verificationConfig.verificationRequired,
          verificationMethod: verificationConfig.verificationMethod,
          verificationEmail: verificationConfig.verificationEmail || null,
          verificationAccessUrl: verificationConfig.verificationAccessUrl || null,
          verificationMailboxId: verificationConfig.verificationMailboxId || null,
          verificationProvider: verificationConfig.verificationProvider || null,
          verificationInstructions: verificationConfig.verificationInstructions || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Family Group & Member Slots berhasil dibuat!');
        setGroups([json.data, ...groups]);
        setAddModalOpen(false);
        setGroupReference('');
        setOwnerCredentialPlain('');
        setVerificationConfig({
          verificationRequired: false,
          verificationMethod: 'NONE',
          verificationEmail: '',
          verificationAccessUrl: '',
          verificationMailboxId: '',
          verificationProvider: 'GENERIC',
          verificationInstructions: '',
        });
      } else {
        toast.error(json.error || 'Gagal menambahkan Family Group');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi jaringan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevealCredentials = async (grp: any) => {
    setIsRevealing(true);
    setRevealedGroup(grp);
    setRevealModalOpen(true);
    try {
      const res = await fetch(`/api/admin/family-groups/${grp.id}/reveal`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        let cred = json.credential || 'Kredensial kosong';
        if (typeof cred === 'string') {
          cred = formatRevealedPayload(cred);
        }
        if (typeof cred === 'string' && (cred.startsWith('{"cipher"') || cred.startsWith('{"payloadCipher"'))) {
          cred = '[Gagal Dekripsi: Kredensial dienkripsi dengan kunci berbeda. Harap perbarui kredensial via Edit Modal.]';
        }
        setRevealedCred(cred);
      } else {
        setRevealedCred(`[Gagal]: ${json.error || 'Izin ditolak'}`);
      }
    } catch (err: any) {
      setRevealedCred(`[Error]: ${err.message}`);
    } finally {
      setIsRevealing(false);
    }
  };

  const openEditModal = (grp: any) => {
    setEditingGroup(grp);
    setEditGroupRef(grp.groupReference);
    setEditOwnerCred('');
    setEditStatus(grp.status);
    setEditSupplierId(grp.supplierId || '');
    setEditSupplierRef(grp.supplierReference || '');
    setEditCost(grp.acquisitionCost ? String(grp.acquisitionCost) : '0');
    setEditExpiry(grp.masterExpiresAt ? new Date(grp.masterExpiresAt).toISOString().split('T')[0] : '');
    setEditVerificationConfig({
      verificationRequired: Boolean(grp.verificationRequired),
      verificationMethod: grp.verificationMethod || 'NONE',
      verificationEmail: grp.verificationEmail || '',
      verificationAccessUrl: grp.verificationAccessUrl || '',
      verificationMailboxId: grp.verificationMailboxId || '',
      verificationProvider: grp.verificationProvider || 'GENERIC',
      verificationInstructions: grp.verificationInstructions || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/family-groups/${editingGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupReference: editGroupRef,
          status: editStatus,
          supplierId: editSupplierId || null,
          supplierReference: editSupplierRef.trim() || null,
          acquisitionCost: Number(editCost) || 0,
          masterExpiresAt: editExpiry || null,
          ownerCredentialPlain: editOwnerCred.trim() || undefined,
          verificationRequired: editVerificationConfig.verificationRequired,
          verificationMethod: editVerificationConfig.verificationMethod,
          verificationEmail: editVerificationConfig.verificationEmail || null,
          verificationAccessUrl: editVerificationConfig.verificationAccessUrl || null,
          verificationMailboxId: editVerificationConfig.verificationMailboxId || null,
          verificationProvider: editVerificationConfig.verificationProvider || null,
          verificationInstructions: editVerificationConfig.verificationInstructions || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Family Group berhasil diperbarui!');
        setGroups((prev) => prev.map((g) => (g.id === editingGroup.id ? json.data : g)));
        setEditModalOpen(false);
      } else {
        toast.error(json.error || 'Gagal menyimpan perubahan');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteGroup = async (grpId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Family Group ini?')) return;

    try {
      const res = await fetch(`/api/admin/family-groups/${grpId}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Family Group berhasil dihapus!');
        setGroups((prev) => prev.filter((g) => g.id !== grpId));
      } else {
        toast.error(json.error || 'Gagal menghapus Family Group');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    }
  };

  const filteredGroups = groups.filter((g) => {
    const matchesSearch =
      g.groupReference.toLowerCase().includes(search.toLowerCase()) ||
      g.variant?.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.variant?.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (g.supplierReference && g.supplierReference.toLowerCase().includes(search.toLowerCase()));

    if (filterStatus === 'ALL') return matchesSearch;
    return matchesSearch && g.status === filterStatus;
  });

  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage) || 1;
  const paginatedGroups = filteredGroups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <UserCheck className="h-3.5 w-3.5" />
              <span>Family Plan &amp; Email Invitation System</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Inventaris Family Groups
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Kelola Family Group (Spotify / YouTube / Canva Family), status undangan email member (1 Admin Owner = N Member Slots), kapasitas grup, serta tanggal perpanjangan master.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-indigo-500/20 transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Family Group Baru</span>
          </button>
        </div>
      </div>

      {/* Metrics Overview Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Grup Family</p>
          <p className="text-2xl font-black text-white font-mono">{totalGroups}</p>
        </div>

        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Slot Member Terisi</p>
          <p className="text-2xl font-black text-indigo-300 font-mono">
            {occupiedSlots} <span className="text-xs text-slate-500 font-normal">/ {totalSlots} Slot</span>
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Slot Ready Dijual</p>
          <p className="text-2xl font-black text-emerald-300 font-mono">{availableSlots} Slot</p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Modal Inventori Tersimpan</p>
          <p className="text-2xl font-black text-cyan-300 font-mono">{formatIDR(totalCostStored)}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari reference grup, produk, supplier..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-1.5 text-xs overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'AVAILABLE', 'PARTIALLY_USED', 'FULL', 'INVALID'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setFilterStatus(st);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-[11px] whitespace-nowrap ${
                filterStatus === st
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Family Groups Table */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4 text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px]">
                <th className="p-4">Group Reference</th>
                <th className="p-4">Produk &amp; Varian</th>
                <th className="p-4">Supplier &amp; Modal</th>
                <th className="p-4">Slot Member</th>
                <th className="p-4">Masa Berlaku</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedGroups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Tidak ada Family Group yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((grp) => {
                  const assignedCount = grp.members?.filter((m: any) => m.status === 'ASSIGNED').length || 0;
                  const isExpanded = expandedGroupId === grp.id;

                  return (
                    <React.Fragment key={grp.id}>
                      <tr className="hover:bg-slate-800/40 transition">
                        <td className="p-4">
                        <div className="font-extrabold text-white font-mono flex items-center gap-1.5">
                          <UserPlus className="h-3.5 w-3.5 text-indigo-400" />
                          <span>{grp.groupReference}</span>
                        </div>
                        {grp.supplierReference && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Ref: {grp.supplierReference}
                          </div>
                        )}
                        {grp.verificationRequired && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono text-[9px] font-extrabold flex items-center gap-1">
                              <ShieldCheck className="h-2.5 w-2.5 text-cyan-400" />
                              <span>VERIF: {grp.verificationMethod}</span>
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-white">{grp.variant?.product?.name || 'Produk Family'}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{grp.variant?.name || '-'}</p>
                      </td>
                      <td className="p-4">
                        {grp.supplier ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                            <Truck className="h-3 w-3 text-cyan-400" />
                            <span>{grp.supplier.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                        <div className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">
                          {formatIDR(grp.acquisitionCost || 0)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                            <div
                              className="bg-indigo-500 h-full rounded-full transition-all"
                              style={{ width: `${(assignedCount / (grp.maxMembers || 1)) * 100}%` }}
                            />
                          </div>
                          <span className="font-mono text-slate-300 font-bold text-[11px]">
                            {assignedCount}/{grp.maxMembers}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        {grp.masterExpiresAt ? (
                          <div className="text-slate-300 text-[11px]">
                            {formatDateJakarta(grp.masterExpiresAt)}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Selamanya</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              grp.status === 'AVAILABLE'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : grp.status === 'PARTIALLY_USED'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : grp.status === 'FULL'
                                ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {grp.status}
                          </span>

                          {(grp.status === 'INVALID' || grp.status === 'DISABLED') && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black uppercase flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3 text-rose-400" />
                              <span>GRUP NONAKTIF</span>
                            </span>
                          )}

                          {grp.members?.some((m: any) => m.status === 'INVALID') && assignedCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black uppercase flex items-center gap-1 animate-pulse">
                              <ShieldAlert className="h-3 w-3 text-rose-400" />
                              <span>⚠️ {grp.members.filter((m: any) => m.status === 'INVALID').length} SLOT RUSAK ({assignedCount} SISA BUTUH MIGRASI)</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setExpandedGroupId(isExpanded ? null : grp.id)}
                            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] inline-flex items-center gap-1 transition"
                            title="Buka detail member slots"
                          >
                            <span>Slots</span>
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRevealCredentials(grp)}
                            className="p-1.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-400 transition"
                            title="Reveal Kredensial Owner"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openRotateModal(grp)}
                            className="px-2 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-[10px] font-bold transition flex items-center gap-1"
                            title="Ganti Kredensial Owner / Link & Rilis Member Available"
                          >
                            <KeyRound className="h-3 w-3" />
                            <span>Ganti Cred</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(grp)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            title="Edit Family Group"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {grp.status !== 'INVALID' && (
                            <button
                              type="button"
                              onClick={() => setInvalidatingGroupId(grp.id)}
                              className={`px-2 py-1 rounded-xl border text-[10px] font-bold transition flex items-center gap-1 ${
                                grp.members?.some((m: any) => m.status === 'INVALID') && assignedCount > 0
                                  ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 hover:bg-rose-500/30 animate-pulse shadow-sm shadow-rose-500/20'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                              }`}
                              title={
                                assignedCount > 0
                                  ? `Nonaktifkan Group & Migrasikan ${assignedCount} Member Tersisa`
                                  : 'Nonaktifkan Group'
                              }
                            >
                              <span>⚡</span>
                              <span>{assignedCount > 0 ? `Migrasi (${assignedCount})` : 'Replace'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(grp.id)}
                            className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-400 transition"
                            title="Hapus Family Group"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Member Slots View */}
                    {isExpanded && (
                      <tr className="bg-slate-950/70">
                        <td colSpan={7} className="p-4 pl-10 border-b border-slate-800">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-extrabold text-white text-xs flex items-center gap-2">
                                <Users className="h-3.5 w-3.5 text-indigo-400" />
                                <span>Rincian Slot Undangan Member ({grp.members?.length || 0} Slots)</span>
                              </h4>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {grp.members?.map((m: any) => (
                                <div
                                  key={m.id}
                                  className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-white">Member #{m.slotNumber}</span>
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                        m.status === 'AVAILABLE'
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                      }`}
                                    >
                                      {m.status}
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-slate-400 truncate">
                                    Email: <span className="text-slate-200 font-mono">{m.user?.email || 'Belum Terisi'}</span>
                                  </div>

                                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                                    <span>Status Undangan:</span>
                                    <span className="font-bold text-slate-300 uppercase">{m.invitationStatus || 'NOT_ASSIGNED'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredGroups.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Modal: Tambah Family Group */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl relative">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-400" />
                <span>Tambah Family Group Baru</span>
              </h2>
              <p className="text-xs text-slate-400">
                Sistem akan membuat group dan slot member secara otomatis.
              </p>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Varian Produk (Family)</label>
                <select
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  {familyVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.product?.name} - {v.name} ({v.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Supplier Asal</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Internal / Tanpa Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Nomor Ref Supplier</label>
                  <input
                    type="text"
                    placeholder="Contoh: INV-SUP-091"
                    value={supplierReference}
                    onChange={(e) => setSupplierReference(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Group Reference (Label)</label>
                  <input
                    type="text"
                    required
                    value={groupReference}
                    onChange={(e) => setGroupReference(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Kapasitas Slot Member</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Biaya Modal / Cost (IDR)</label>
                  <input
                    type="number"
                    value={acquisitionCost}
                    onChange={(e) => setAcquisitionCost(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Masa Berlaku Master</label>
                  <input
                    type="date"
                    value={masterExpiresAt}
                    onChange={(e) => setMasterExpiresAt(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Kredensial Owner / Admin Family</label>
                <textarea
                  rows={2}
                  placeholder="Email admin, password grup, atau link undangan family..."
                  value={ownerCredentialPlain}
                  onChange={(e) => setOwnerCredentialPlain(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Verification Access Configuration Section */}
              <div className="pt-2 border-t border-slate-800">
                <VerificationAccessConfigSection
                  value={verificationConfig}
                  onChange={setVerificationConfig}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reveal Owner Credential */}
      {revealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
            <button
              onClick={() => setRevealModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-cyan-400" />
                <span>Kredensial Owner Family</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">{revealedGroup?.groupReference}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              {isRevealing ? (
                <p className="text-xs text-cyan-300 font-mono">Mendekripsi...</p>
              ) : (
                <FormattedCredentialView content={revealedCred} />
              )}
            </div>

            <div className="flex justify-end gap-2">
              {!isRevealing && extractFirstUrl(revealedCred) && (
                <a
                  href={extractFirstUrl(revealedCred)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Buka Link</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(revealedCred);
                  toast.success('Kredensial disalin!');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Salin Kredensial</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Family Group */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl relative">
            <button
              onClick={() => setEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-indigo-400" />
                <span>Edit Family Group</span>
              </h2>
              <p className="text-xs text-slate-400">{editingGroup?.groupReference}</p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Group Reference</label>
                  <input
                    type="text"
                    required
                    value={editGroupRef}
                    onChange={(e) => setEditGroupRef(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Status Grup</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-bold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="AVAILABLE">AVAILABLE (Tersedia)</option>
                    <option value="PARTIALLY_USED">PARTIALLY_USED</option>
                    <option value="FULL">FULL (Penuh)</option>
                    <option value="INVALID">INVALID (Bermasalah)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Supplier</label>
                  <select
                    value={editSupplierId}
                    onChange={(e) => setEditSupplierId(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Tanpa Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Biaya Modal (IDR)</label>
                  <input
                    type="number"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Nomor Ref Supplier</label>
                  <input
                    type="text"
                    value={editSupplierRef}
                    onChange={(e) => setEditSupplierRef(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Masa Berlaku Master</label>
                  <input
                    type="date"
                    value={editExpiry}
                    onChange={(e) => setEditExpiry(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Update Kredensial Owner (Kosongkan jika tidak ubah)</label>
                <textarea
                  rows={2}
                  placeholder="Ketik kredensial baru..."
                  value={editOwnerCred}
                  onChange={(e) => setEditOwnerCred(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Verification Access Configuration Section */}
              <div className="pt-2 border-t border-slate-800">
                <VerificationAccessConfigSection
                  value={editVerificationConfig}
                  onChange={setEditVerificationConfig}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROTATE OWNER CREDENTIAL & RELEASE MEMBER SLOTS MODAL */}
      {rotateModalOpen && rotatingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-400" />
                <span>Ganti Credential / Link &amp; Rilis Member ({rotatingGroup.groupReference})</span>
              </h2>
              <button
                type="button"
                onClick={() => setRotateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/20 text-xs text-slate-300 space-y-1">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                <span>Rotasi Owner Credential / Invite Link</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Silakan perbarui kredensial owner atau generate link undangan baru di platform resmi. Masukkan kredensial baru di bawah, lalu pilih member slot mana saja yang ingin dirilis kembali menjadi <strong>AVAILABLE</strong>.
              </p>
              {rotatingGroup.masterExpiresAt && (
                <div className="text-[10px] text-cyan-400 pt-1 font-mono">
                  Masa Aktif Master: {formatDateJakarta(rotatingGroup.masterExpiresAt)}
                </div>
              )}
            </div>

            <form onSubmit={handleExecuteRotateCredential} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Owner Kredensial / Link Undangan Baru <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newOwnerCred}
                  onChange={(e) => setNewOwnerCred(e.target.value)}
                  placeholder="https://invite.family.link/... atau email:pass owner baru..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-300 flex items-center justify-between">
                  <span>Pilih Member Slot yang Ingin Dirilis ke AVAILABLE:</span>
                  <span className="text-[10px] text-slate-500">
                    ({selectedMemberIdsToRelease.length}/{rotatingGroup.members?.length || 0} dipilih)
                  </span>
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {rotatingGroup.members?.map((m: any) => {
                    const isChecked = selectedMemberIdsToRelease.includes(m.id);
                    const isExpired = m.status === 'EXPIRED' || (m.expiresAt && new Date(m.expiresAt) <= new Date());

                    return (
                      <label
                        key={m.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500/40 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMemberIdsToRelease((prev) => [...prev, m.id]);
                              } else {
                                setSelectedMemberIdsToRelease((prev) => prev.filter((id) => id !== m.id));
                              }
                            }}
                            className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                          />
                          <span className="font-bold font-mono">#{m.slotNumber} {m.slotLabel || `Member ${m.slotNumber}`}</span>
                          {m.assignedUser?.email && (
                            <span className="text-[10px] text-slate-400 font-normal">({m.assignedUser.email})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isExpired && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[9px] font-bold">
                              Expired
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono font-bold">
                            {m.status}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRotateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isRotatingCredential || !newOwnerCred.trim() || selectedMemberIdsToRelease.length === 0}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>{isRotatingCredential ? 'Memproses...' : 'Simpan & Rilis Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MASS REPLACEMENT MODAL CONFIRMATION */}
      {invalidatingGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
            <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              <span>Konfirmasi Mass Replacement Family Group</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tindakan ini akan menandai Family Group sebagai <strong>INVALID</strong> dan secara otomatis memindahkan seluruh slot member aktif yang terdampak ke Family Group baru yang masih tersedia.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvalidatingGroupId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isInvalidating}
                onClick={() => handleInvalidateGroup(invalidatingGroupId)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>{isInvalidating ? 'Memproses Migrasi...' : 'Ya, Nonaktifkan & Migrasi Semua Member'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
