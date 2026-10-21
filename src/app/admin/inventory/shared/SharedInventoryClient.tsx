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
  ExternalLink,
  ChevronDown,
  ChevronUp,
  KeyRound,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateJakarta, formatIDR } from '@/lib/utils/formatters';
import { Pagination } from '@/components/ui/Pagination';
import { VerificationAccessConfigSection, VerificationAccessState } from '@/components/admin/VerificationAccessConfigSection';

interface SlotProfileInput {
  slotNumber: number;
  slotLabel: string;
  pin: string;
}

interface SharedInventoryClientProps {
  initialAccounts: any[];
  sharedVariants: any[];
  suppliers?: any[];
}

export function SharedInventoryClient({
  initialAccounts,
  sharedVariants,
  suppliers = [],
}: SharedInventoryClientProps) {
  const [accounts, setAccounts] = useState<any[]>(initialAccounts);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modal State for Adding New Shared Account
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [variantId, setVariantId] = useState(sharedVariants[0]?.id || '');
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [supplierReference, setSupplierReference] = useState('');
  const [label, setLabel] = useState('');
  const [credentialPlain, setCredentialPlain] = useState('');
  const [maxSlots, setMaxSlots] = useState('2');
  const [acquisitionCost, setAcquisitionCost] = useState('100000');
  const [masterExpiresAt, setMasterExpiresAt] = useState('');

  const [verificationConfig, setVerificationConfig] = useState<VerificationAccessState>({
    verificationRequired: false,
    verificationMethod: 'NONE',
    verificationEmail: '',
    verificationAccessUrl: '',
    verificationMailboxId: '',
    verificationProvider: 'GENERIC',
    verificationInstructions: '',
  });

  const [slotProfiles, setSlotProfiles] = useState<SlotProfileInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State: Reveal Master Credential
  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const [revealedCred, setRevealedCred] = useState<string>('');
  const [revealedAccount, setRevealedAccount] = useState<any | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  // Revealed Slot PINs cache: { [slotId: string]: string }
  const [revealedSlotPins, setRevealedSlotPins] = useState<{ [key: string]: string }>({});
  const [loadingSlotPinId, setLoadingSlotPinId] = useState<string | null>(null);

  // Modal State: Edit Shared Account Master
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCredPlain, setEditCredPlain] = useState('');
  const [editStatus, setEditStatus] = useState('AVAILABLE');
  const [editSupplierId, setEditSupplierId] = useState('');
  const [editSupplierRef, setEditSupplierRef] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editCapacity, setEditCapacity] = useState('2');
  const [newSlotInputs, setNewSlotInputs] = useState<SlotProfileInput[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [editVerificationConfig, setEditVerificationConfig] = useState<VerificationAccessState>({
    verificationRequired: false,
    verificationMethod: 'NONE',
    verificationEmail: '',
    verificationAccessUrl: '',
    verificationMailboxId: '',
    verificationProvider: 'GENERIC',
    verificationInstructions: '',
  });

  // Modal State: Edit Slot Profile & PIN
  const [editSlotModalOpen, setEditSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<any | null>(null);
  const [slotEditLabel, setSlotEditLabel] = useState('');
  const [slotEditPin, setSlotEditPin] = useState('');
  const [slotEditStatus, setSlotEditStatus] = useState('AVAILABLE');
  const [isSavingSlotEdit, setIsSavingSlotEdit] = useState(false);

  // Modal State for Mass Replacement
  const [invalidatingId, setInvalidatingId] = useState<string | null>(null);
  const [isInvalidating, setIsInvalidating] = useState(false);

  // Modal State: Rotate Password & Release Slots
  const [rotateModalOpen, setRotateModalOpen] = useState(false);
  const [rotatingAccount, setRotatingAccount] = useState<any | null>(null);
  const [newMasterCred, setNewMasterCred] = useState('');
  const [selectedSlotIdsToRelease, setSelectedSlotIdsToRelease] = useState<string[]>([]);
  const [isRotatingPassword, setIsRotatingPassword] = useState(false);

  const openRotateModal = (acc: any) => {
    setRotatingAccount(acc);
    setNewMasterCred('');
    const now = new Date();
    // Pre-select slots that are EXPIRED, or ASSIGNED with expiresAt <= now
    const expiredSlotIds = acc.slots
      ?.filter((s: any) => s.status === 'EXPIRED' || (s.expiresAt && new Date(s.expiresAt) <= now))
      .map((s: any) => s.id) || [];
    setSelectedSlotIdsToRelease(expiredSlotIds.length > 0 ? expiredSlotIds : acc.slots?.map((s: any) => s.id) || []);
    setRotateModalOpen(true);
  };

  const handleExecuteRotatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotatingAccount || !newMasterCred.trim()) {
      toast.error('Password / Kredensial baru wajib diisi');
      return;
    }

    setIsRotatingPassword(true);
    try {
      const res = await fetch(`/api/admin/shared-accounts/${rotatingAccount.id}/rotate-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialPlain: newMasterCred.trim(),
          releaseSlotIds: selectedSlotIdsToRelease,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message || 'Password master berhasil diperbarui & slot telah dirilis!');
        setAccounts((prev) => prev.map((a) => (a.id === rotatingAccount.id ? json.data : a)));
        setRotateModalOpen(false);
      } else {
        toast.error(json.error || 'Gagal merotasi password');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsRotatingPassword(false);
    }
  };

  const selectedVariant = sharedVariants.find((v) => v.id === variantId) || sharedVariants[0];
  const usesProfile = selectedVariant?.usesProfile !== false;
  const usesProfilePin = selectedVariant?.usesProfilePin !== false;

  // Helper to generate sequential auto-label based on SKU (e.g. ADB-SH-1M-001)
  const generateAutoLabel = (vId: string) => {
    const v = sharedVariants.find((x) => x.id === vId);
    if (!v) return 'SH-001';
    const prefix = v.sku ? v.sku.toUpperCase() : 'SHARED';
    const existingCount = accounts.filter((a) => a.productVariantId === vId).length;
    const nextNum = (existingCount + 1).toString().padStart(3, '0');
    return `${prefix}-${nextNum}`;
  };

  // Sync slot input cards whenever maxSlots or variant changes in Add Modal
  useEffect(() => {
    if (addModalOpen && variantId) {
      setLabel(generateAutoLabel(variantId));
      const slotsCount = Math.max(1, Math.min(20, Number(maxSlots) || 2));
      setSlotProfiles((prev) => {
        const next: SlotProfileInput[] = [];
        for (let i = 1; i <= slotsCount; i++) {
          const existing = prev.find((p) => p.slotNumber === i);
          next.push(
            existing || {
              slotNumber: i,
              slotLabel: usesProfile ? `Profile ${i}` : `Slot ${i}`,
              pin: '',
            }
          );
        }
        return next;
      });
    }
  }, [addModalOpen, variantId, maxSlots, usesProfile]);

  // Metrics Calculations
  const totalAccounts = accounts.length;
  let totalSlots = 0;
  let usedSlots = 0;
  let availableSlots = 0;
  let invalidAccounts = 0;
  let totalCostStored = 0;

  accounts.forEach((acc) => {
    totalSlots += acc.maxSlots || 0;
    const assignedCount = acc.slots?.filter((s: any) => s.status === 'ASSIGNED').length || 0;
    usedSlots += assignedCount;
    availableSlots += (acc.maxSlots || 0) - assignedCount;
    if (acc.status === 'INVALID') invalidAccounts++;
    totalCostStored += acc.acquisitionCost || 0;
  });

  const occupancyRate = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0;

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantId || !label || !credentialPlain) {
      toast.error('Harap isi variant, label, dan kredensial master account.');
      return;
    }

    if (usesProfile) {
      for (const sp of slotProfiles) {
        if (!sp.slotLabel || !sp.slotLabel.trim()) {
          toast.error(`Harap isi Profile Name untuk Slot ${sp.slotNumber}.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/shared-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productVariantId: variantId,
          label,
          credentialPlain,
          maxSlots: Number(maxSlots) || 2,
          acquisitionCost: Number(acquisitionCost) || 0,
          masterExpiresAt: masterExpiresAt ? masterExpiresAt : null,
          supplierId: selectedSupplierId || null,
          supplierReference: supplierReference.trim() || null,
          slots: slotProfiles.map((s) => ({
            slotNumber: s.slotNumber,
            slotLabel: s.slotLabel.trim(),
            pin: s.pin.trim() || null,
          })),
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
        toast.success('Shared Account & Slot Profile berhasil dibuat!');
        setAccounts([json.data, ...accounts]);
        setAddModalOpen(false);
        setLabel('');
        setCredentialPlain('');
        setSlotProfiles([]);
      } else {
        toast.error(json.error || 'Gagal menambahkan Shared Account');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi jaringan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevealCredentials = async (acc: any) => {
    setIsRevealing(true);
    setRevealedAccount(acc);
    setRevealModalOpen(true);
    try {
      const res = await fetch(`/api/admin/shared-accounts/${acc.id}/reveal`, { method: 'POST' });
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

  const handleToggleRevealSlotPin = async (slotId: string) => {
    if (revealedSlotPins[slotId]) {
      setRevealedSlotPins((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
      return;
    }

    setLoadingSlotPinId(slotId);
    try {
      const res = await fetch(`/api/admin/shared-accounts/slots/${slotId}/reveal`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setRevealedSlotPins((prev) => ({
          ...prev,
          [slotId]: json.pin || '(Tanpa PIN)',
        }));
      } else {
        toast.error(json.error || 'Gagal mendekripsi PIN slot');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan saat reveal PIN');
    } finally {
      setLoadingSlotPinId(null);
    }
  };

  const openEditModal = (acc: any) => {
    setEditingAccount(acc);
    setEditLabel(acc.label);
    setEditCredPlain('');
    setEditStatus(acc.status);
    setEditSupplierId(acc.supplierId || '');
    setEditSupplierRef(acc.supplierReference || '');
    setEditCost(acc.acquisitionCost ? String(acc.acquisitionCost) : '0');
    setEditExpiry(acc.masterExpiresAt ? new Date(acc.masterExpiresAt).toISOString().split('T')[0] : '');
    setEditCapacity(String(acc.maxSlots || 2));
    setEditVerificationConfig({
      verificationRequired: Boolean(acc.verificationRequired),
      verificationMethod: acc.verificationMethod || 'NONE',
      verificationEmail: acc.verificationEmail || '',
      verificationAccessUrl: acc.verificationAccessUrl || '',
      verificationMailboxId: acc.verificationMailboxId || '',
      verificationProvider: acc.verificationProvider || 'GENERIC',
      verificationInstructions: acc.verificationInstructions || '',
    });
    setNewSlotInputs([]);
    setEditModalOpen(true);
  };

  // Sync new slot input cards when increasing capacity in Edit Shared Account Modal
  const handleEditCapacityChange = (newCapStr: string) => {
    setEditCapacity(newCapStr);
    const newCap = Number(newCapStr) || 2;
    const currentCap = editingAccount?.maxSlots || 2;
    if (newCap > currentCap) {
      const neededCount = newCap - currentCap;
      const inputs: SlotProfileInput[] = [];
      for (let i = currentCap + 1; i <= newCap; i++) {
        inputs.push({
          slotNumber: i,
          slotLabel: `Profile ${i}`,
          pin: '',
        });
      }
      setNewSlotInputs(inputs);
    } else {
      setNewSlotInputs([]);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/shared-accounts/${editingAccount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: editLabel,
          status: editStatus,
          supplierId: editSupplierId || null,
          supplierReference: editSupplierRef.trim() || null,
          acquisitionCost: Number(editCost) || 0,
          masterExpiresAt: editExpiry || null,
          credentialPlain: editCredPlain.trim() || undefined,
          maxSlots: Number(editCapacity) || editingAccount.maxSlots,
          newSlots: newSlotInputs.length > 0 ? newSlotInputs : undefined,
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
        toast.success('Shared Account berhasil diperbarui!');
        setAccounts((prev) => prev.map((a) => (a.id === editingAccount.id ? json.data : a)));
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

  const openEditSlotModal = (slot: any, parentAccId: string) => {
    setEditingSlot({
      ...slot,
      parentAccountId: parentAccId,
      isAssigned: slot.status === 'ASSIGNED',
    });
    setSlotEditLabel(slot.slotLabel || '');
    setSlotEditPin('');
    setSlotEditStatus(slot.status);
    setEditSlotModalOpen(true);
  };

  const handleSaveSlotEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    setIsSavingSlotEdit(true);
    try {
      const res = await fetch(`/api/admin/shared-accounts/slots/${editingSlot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotLabel: slotEditLabel.trim(),
          pin: slotEditPin.trim() || undefined,
          status: slotEditStatus,
          force: true,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Profile slot & PIN berhasil disimpan!');
        // Update local state
        setAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id === editingSlot.parentAccountId) {
              const updatedSlots = acc.slots.map((s: any) =>
                s.id === editingSlot.id ? { ...s, ...json.data } : s
              );
              return { ...acc, slots: updatedSlots };
            }
            return acc;
          })
        );
        // Clear revealed pin cache for this slot if updated
        if (slotEditPin.trim()) {
          setRevealedSlotPins((prev) => {
            const next = { ...prev };
            delete next[editingSlot.id];
            return next;
          });
        }
        setEditSlotModalOpen(false);
      } else {
        toast.error(json.message || json.error || 'Gagal memperbarui slot');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan saat menyimpan slot');
    } finally {
      setIsSavingSlotEdit(false);
    }
  };

  const handleQuickSlotStatusChange = async (slotId: string, parentAccId: string, targetStatus: string) => {
    try {
      const res = await fetch(`/api/admin/shared-accounts/slots/${slotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus, force: true }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Slot berhasil diubah menjadi ${targetStatus}!`);
        setAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id === parentAccId) {
              const updatedSlots = acc.slots.map((s: any) =>
                s.id === slotId ? { ...s, ...json.data } : s
              );
              return { ...acc, slots: updatedSlots };
            }
            return acc;
          })
        );
      } else {
        toast.error(json.message || json.error || 'Gagal mengubah status slot');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    }
  };

  const handleDeleteAccount = async (accId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Shared Account ini?')) return;

    try {
      const res = await fetch(`/api/admin/shared-accounts/${accId}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success('Shared Account berhasil dihapus!');
        setAccounts((prev) => prev.filter((a) => a.id !== accId));
      } else {
        toast.error(json.error || 'Gagal menghapus Shared Account');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    }
  };

  const handleInvalidate = async (accId: string) => {
    setIsInvalidating(true);
    try {
      const res = await fetch(`/api/admin/shared-accounts/${accId}/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'MASTER_ACCOUNT_INVALID' }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message);
        setAccounts((prev) =>
          prev.map((a) => (a.id === accId ? { ...a, status: 'INVALID' } : a))
        );
        setInvalidatingId(null);
      } else {
        toast.error(json.error || 'Gagal menonaktifkan master account');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setIsInvalidating(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.label.toLowerCase().includes(search.toLowerCase()) ||
      acc.variant?.name?.toLowerCase().includes(search.toLowerCase()) ||
      acc.variant?.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
      acc.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (acc.supplierReference && acc.supplierReference.toLowerCase().includes(search.toLowerCase()));

    if (filterStatus === 'ALL') return matchesSearch;
    return matchesSearch && acc.status === filterStatus;
  });

  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage) || 1;
  const paginatedAccounts = filteredAccounts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Users className="h-3.5 w-3.5" />
              <span>Multi-Slot Shared &amp; Multi-Profile Hub</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Akun Shared &amp; Profile PIN
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Konfigurasi manual Master Account, nama Profile, dan PIN per slot (e.g. Netflix 1 Master : 5 Profile). Sistem menjamin enkripsi PIN credential, review slot kadaluarsa, dan alokasi otomatis tanpa auto-rename.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Master Akun Baru</span>
          </button>
        </div>
      </div>

      {/* Metrics Overview Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Akun Shared</p>
          <p className="text-2xl font-black text-white font-mono">{totalAccounts}</p>
        </div>

        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Slot Terpakai / Total</p>
          <p className="text-2xl font-black text-cyan-300 font-mono">
            {usedSlots} <span className="text-xs text-slate-500 font-normal">/ {totalSlots} Slot</span>
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Occupancy Rate (%)</p>
          <p className="text-2xl font-black text-emerald-300 font-mono">{occupancyRate}%</p>
        </div>

        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Akun Non-Aktif / Invalid</p>
          <p className="text-2xl font-black text-rose-300 font-mono">{invalidAccounts}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari label reference, produk, supplier..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
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
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Shared Accounts Table */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-4 text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px]">
                <th className="p-4">Reference</th>
                <th className="p-4">Produk &amp; Varian</th>
                <th className="p-4">Supplier &amp; Modal</th>
                <th className="p-4">Slot Profile</th>
                <th className="p-4">Masa Berlaku</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Tidak ada inventaris Shared Account yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((acc) => {
                  const assignedSlotsCount = acc.slots?.filter((s: any) => s.status === 'ASSIGNED').length || 0;
                  const isExpanded = expandedAccountId === acc.id;

                  return (
                    <React.Fragment key={acc.id}>
                      <tr className="hover:bg-slate-800/30 transition">
                        <td className="p-4">
                        <div className="font-mono font-extrabold text-white text-xs flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-cyan-400" />
                          <span>{acc.label}</span>
                        </div>
                        {acc.supplierReference && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Ref: {acc.supplierReference}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-white text-xs">{acc.variant?.product?.name}</p>
                        <p className="text-[10px] text-cyan-400 font-medium">{acc.variant?.name}</p>
                      </td>

                      <td className="p-4">
                        {acc.supplier ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                            <Truck className="h-3 w-3 text-cyan-400" />
                            <span>{acc.supplier.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                        <div className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">
                          {formatIDR(acc.acquisitionCost || 0)}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                            <div
                              className="bg-cyan-500 h-full rounded-full transition-all"
                              style={{ width: `${(assignedSlotsCount / (acc.maxSlots || 1)) * 100}%` }}
                            />
                          </div>
                          <span className="font-mono text-slate-300 font-bold text-[11px]">
                            {assignedSlotsCount}/{acc.maxSlots}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        {acc.masterExpiresAt ? (
                          <span className="font-mono text-slate-300 text-[11px]">
                            {formatDateJakarta(acc.masterExpiresAt)}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Lifetime</span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                              acc.status === 'AVAILABLE'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : acc.status === 'PARTIALLY_USED'
                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                : acc.status === 'FULL'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {acc.status}
                          </span>

                          {(acc.status === 'INVALID' || acc.status === 'DISABLED') && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black uppercase flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3 text-rose-400" />
                              <span>AKUN NONAKTIF</span>
                            </span>
                          )}

                          {acc.slots?.some((s: any) => s.status === 'INVALID') && assignedSlotsCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black uppercase flex items-center gap-1 animate-pulse">
                              <ShieldAlert className="h-3 w-3 text-rose-400" />
                              <span>⚠️ {acc.slots.filter((s: any) => s.status === 'INVALID').length} SLOT RUSAK ({assignedSlotsCount} SISA BUTUH MIGRASI)</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setExpandedAccountId(isExpanded ? null : acc.id)}
                            className={`p-1.5 rounded-xl transition ${
                              isExpanded ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                            title="Lihat Detail Slot Profile & PIN"
                          >
                            <Layers className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRevealCredentials(acc)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
                            title="Reveal Kredensial Master"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openRotateModal(acc)}
                            className="px-2 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-[10px] font-bold transition flex items-center gap-1"
                            title="Ganti Password Master & Rilis Slot Available"
                          >
                            <KeyRound className="h-3 w-3" />
                            <span>Ganti Pass</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(acc)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            title="Edit Shared Account"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {acc.status !== 'INVALID' && (
                            <button
                              type="button"
                              onClick={() => setInvalidatingId(acc.id)}
                              className={`px-2 py-1 rounded-xl border text-[10px] font-bold transition flex items-center gap-1 ${
                                acc.slots?.some((s: any) => s.status === 'INVALID') && assignedSlotsCount > 0
                                  ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 hover:bg-rose-500/30 animate-pulse shadow-sm shadow-rose-500/20'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                              }`}
                              title={
                                assignedSlotsCount > 0
                                  ? `Nonaktifkan Master & Migrasikan ${assignedSlotsCount} Customer Tersisa`
                                  : 'Nonaktifkan Master'
                              }
                            >
                              <span>⚡</span>
                              <span>{assignedSlotsCount > 0 ? `Migrasi (${assignedSlotsCount})` : 'Replace'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(acc.id)}
                            className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-400 transition"
                            title="Hapus Shared Account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Slots View with PIN Reveal and Edit Actions */}
                    {isExpanded && (
                      <tr className="bg-slate-950/70">
                        <td colSpan={7} className="p-4 pl-8 border-b border-slate-800">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-extrabold text-white text-xs flex items-center gap-2">
                                <Layers className="h-3.5 w-3.5 text-cyan-400" />
                                <span>Rincian Slot &amp; Profile PIN ({acc.slots?.length || 0} Slots)</span>
                              </h4>
                              <span className="text-[10px] text-slate-400">
                                💡 PIN dienkripsi dengan standar aman. Hanya tampilkan jika dibutuhkan.
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {acc.slots?.map((s: any) => {
                                const isPinRevealed = !!revealedSlotPins[s.id];
                                const currentPinVal = revealedSlotPins[s.id];
                                const hasPinEncrypted = !!s.pinEncrypted;

                                return (
                                  <div
                                    key={s.id}
                                    className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 text-xs shadow-sm hover:border-slate-700 transition"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-slate-300">
                                          #{s.slotNumber}
                                        </span>
                                        <span className="font-mono font-bold text-white text-xs">
                                          {s.slotLabel || `Slot ${s.slotNumber}`}
                                        </span>
                                      </div>

                                      <span
                                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                          s.status === 'AVAILABLE'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : s.status === 'ASSIGNED'
                                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                            : s.status === 'EXPIRED'
                                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                        }`}
                                      >
                                        {s.status}
                                      </span>
                                    </div>

                                    {/* Profile PIN Row */}
                                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                        <KeyRound className="h-3 w-3 text-cyan-400" />
                                        <span>PIN:</span>
                                        <span className="font-mono font-bold text-cyan-300">
                                          {isPinRevealed ? currentPinVal : hasPinEncrypted ? '••••' : '(Tanpa PIN)'}
                                        </span>
                                      </div>

                                      {hasPinEncrypted && (
                                        <button
                                          type="button"
                                          onClick={() => handleToggleRevealSlotPin(s.id)}
                                          disabled={loadingSlotPinId === s.id}
                                          className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 transition"
                                        >
                                          {loadingSlotPinId === s.id ? (
                                            '...'
                                          ) : isPinRevealed ? (
                                            <>
                                              <EyeOff className="h-3 w-3" />
                                              <span>Tutup</span>
                                            </>
                                          ) : (
                                            <>
                                              <Eye className="h-3 w-3" />
                                              <span>Reveal</span>
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </div>

                                    {/* Customer / Order Info */}
                                    <div className="text-[11px] text-slate-400 space-y-0.5">
                                      <div className="truncate">
                                        Customer:{' '}
                                        <span className="text-slate-200 font-mono">
                                          {s.assignedUser?.email || s.assignedUser?.name || (s.status === 'AVAILABLE' ? 'Tersedia' : 'Belum Ada')}
                                        </span>
                                      </div>
                                      {s.expiresAt && (
                                        <div className="text-[10px] text-slate-500">
                                          Expired: {formatDateJakarta(s.expiresAt)}
                                        </div>
                                      )}
                                      {(s.orderItem?.renewalOfSubscriptionId || s.orderItem?.order?.isRenewal) && (
                                        <div className="pt-1">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-extrabold uppercase">
                                            <RefreshCw className="h-2.5 w-2.5 text-purple-400" />
                                            <span>🔄 RE-NEWAL (Perpanjangan Paket)</span>
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Slot Action Controls */}
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                                      <button
                                        type="button"
                                        onClick={() => openEditSlotModal(s, acc.id)}
                                        className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 transition"
                                      >
                                        <Edit2 className="h-3 w-3 text-cyan-400" />
                                        <span>Edit Profile / PIN</span>
                                      </button>

                                      <div className="flex items-center gap-1">
                                        {s.status !== 'AVAILABLE' && (
                                          <button
                                            type="button"
                                            onClick={() => handleQuickSlotStatusChange(s.id, acc.id, 'AVAILABLE')}
                                            className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold transition"
                                            title="Mark as Available setelah direview Admin"
                                          >
                                            Mark Available
                                          </button>
                                        )}
                                        {s.status === 'AVAILABLE' && (
                                          <button
                                            type="button"
                                            onClick={() => handleQuickSlotStatusChange(s.id, acc.id, 'EXPIRED')}
                                            className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-[10px] font-bold transition"
                                            title="Karantina slot untuk review"
                                          >
                                            Quarantine
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
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
          totalItems={filteredAccounts.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* CREATE MODAL WITH MANUAL PROFILE & PIN INPUTS */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-cyan-400" />
                <span>Tambah Inventaris Shared Account &amp; Profile Slots</span>
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Pilih Varian Produk *</label>
                <select
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
                >
                  {sharedVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.product?.name} — {v.name} ({v.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Reference / Label Internal *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADB001 / NFLX-SH-01"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Kredensial Master Account (Username/Email:Password) *</label>
                <input
                  type="text"
                  required
                  placeholder="master@example.com | pass123"
                  value={credentialPlain}
                  onChange={(e) => setCredentialPlain(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Kapasitas Slot (Max Slots)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={maxSlots}
                    onChange={(e) => setMaxSlots(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Biaya Modal Master (Rp)</label>
                  <input
                    type="number"
                    placeholder="e.g. 100000"
                    value={acquisitionCost}
                    onChange={(e) => setAcquisitionCost(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-amber-400 font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Supplier Asal Stok</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Tanpa Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.code}] {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Nomor Ref Supplier</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-SUP-001"
                    value={supplierReference}
                    onChange={(e) => setSupplierReference(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Masa Berlaku Master Account (Opsional)</label>
                <input
                  type="date"
                  value={masterExpiresAt}
                  onChange={(e) => setMasterExpiresAt(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* DYNAMIC MANUAL PROFILE & PIN INPUT CARDS */}
              {usesProfile && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs">
                      <Layers className="h-4 w-4" />
                      <span>Konfigurasi Manual Profile &amp; PIN per Slot ({slotProfiles.length} Slots)</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Isi Nama Profile &amp; PIN manual sesuai akun</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                    {slotProfiles.map((sp, idx) => (
                      <div
                        key={sp.slotNumber}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-white text-[11px]">
                            Slot #{sp.slotNumber}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-medium">Profile Name *</label>
                          <input
                            type="text"
                            required
                            placeholder={`e.g. User ${sp.slotNumber} / Kids`}
                            value={sp.slotLabel}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSlotProfiles((prev) =>
                                prev.map((item) =>
                                  item.slotNumber === sp.slotNumber ? { ...item, slotLabel: val } : item
                                )
                              );
                            }}
                            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-white font-medium text-xs focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        {usesProfilePin && (
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-medium">Profile PIN (Opsional/Sesuai)</label>
                            <input
                              type="text"
                              placeholder="e.g. 1234"
                              value={sp.pin}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSlotProfiles((prev) =>
                                  prev.map((item) =>
                                    item.slotNumber === sp.slotNumber ? { ...item, pin: val } : item
                                  )
                                );
                              }}
                              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VERIFICATION ACCESS CONFIGURATION SECTION */}
              <VerificationAccessConfigSection
                value={verificationConfig}
                onChange={setVerificationConfig}
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Master & Slots'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SLOT PROFILE & PIN MODAL */}
      {editSlotModalOpen && editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
            <button
              onClick={() => setEditSlotModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-cyan-400" />
                <span>Edit Profile &amp; PIN Slot #{editingSlot.slotNumber}</span>
              </h2>
              <p className="text-xs text-slate-400">Atur Profile Name dan PIN untuk slot ini.</p>
            </div>

            {editingSlot.isAssigned && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-amber-300 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <p>
                  <strong>Perhatian:</strong> Slot ini sedang digunakan oleh customer aktif. Mengubah Profile Name atau PIN dapat memengaruhi akses login customer.
                </p>
              </div>
            )}

            <form onSubmit={handleSaveSlotEdit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Profile Name *</label>
                <input
                  type="text"
                  required
                  value={slotEditLabel}
                  onChange={(e) => setSlotEditLabel(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Update Profile PIN</label>
                <input
                  type="text"
                  placeholder="Masukkan PIN baru (biarkan kosong jika tidak diubah)"
                  value={slotEditPin}
                  onChange={(e) => setSlotEditPin(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Status Slot</label>
                <select
                  value={slotEditStatus}
                  onChange={(e) => setSlotEditStatus(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
                >
                  <option value="AVAILABLE">AVAILABLE (Tersedia untuk Customer)</option>
                  <option value="ASSIGNED">ASSIGNED (Sedang Dipakai)</option>
                  <option value="EXPIRED">EXPIRED / QUARANTINED (Butuh Review Admin)</option>
                  <option value="INVALID">INVALID (Bermasalah / Nonaktif)</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditSlotModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingSlotEdit}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow transition disabled:opacity-50"
                >
                  {isSavingSlotEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVEAL MASTER CREDENTIAL MODAL */}
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
                <span>Kredensial Master Shared</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">{revealedAccount?.label}</p>
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

      {/* EDIT MASTER MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl relative">
            <button
              onClick={() => setEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-cyan-400" />
                <span>Edit Shared Account Master</span>
              </h2>
              <p className="text-xs text-slate-400">{editingAccount?.variant?.product?.name}</p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Reference / Label</label>
                <input
                  type="text"
                  required
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Ganti Kredensial Master (Kosongkan jika tidak ingin diubah)</label>
                <input
                  type="text"
                  placeholder="Isi kredensial baru..."
                  value={editCredPlain}
                  onChange={(e) => setEditCredPlain(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Kapasitas Slot (Max Slots)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editCapacity}
                    onChange={(e) => handleEditCapacityChange(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Biaya Modal (Rp)</label>
                  <input
                    type="number"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-amber-400 font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* IF CAPACITY INCREASED, PROMPT FOR NEW SLOTS */}
              {newSlotInputs.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <p className="text-[11px] font-bold text-cyan-400">
                    Slot Baru yang Ditambahkan ({newSlotInputs.length} Slot):
                  </p>
                  <div className="space-y-2">
                    {newSlotInputs.map((nSlot) => (
                      <div key={nSlot.slotNumber} className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400">Profile Name #{nSlot.slotNumber} *</label>
                          <input
                            type="text"
                            required
                            value={nSlot.slotLabel}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewSlotInputs((prev) =>
                                prev.map((item) =>
                                  item.slotNumber === nSlot.slotNumber ? { ...item, slotLabel: val } : item
                                )
                              );
                            }}
                            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2 py-1 text-white text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400">PIN #{nSlot.slotNumber}</label>
                          <input
                            type="text"
                            value={nSlot.pin}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewSlotInputs((prev) =>
                                prev.map((item) =>
                                  item.slotNumber === nSlot.slotNumber ? { ...item, pin: val } : item
                                )
                              );
                            }}
                            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2 py-1 text-cyan-300 text-xs font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Supplier</label>
                  <select
                    value={editSupplierId}
                    onChange={(e) => setEditSupplierId(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Tanpa Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.code}] {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Status Master</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="PARTIALLY_USED">PARTIALLY_USED</option>
                    <option value="FULL">FULL</option>
                    <option value="INVALID">INVALID</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Masa Berlaku Master</label>
                <input
                  type="date"
                  value={editExpiry}
                  onChange={(e) => setEditExpiry(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* VERIFICATION ACCESS CONFIGURATION SECTION */}
              <VerificationAccessConfigSection
                value={editVerificationConfig}
                onChange={setEditVerificationConfig}
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow transition disabled:opacity-50"
                >
                  {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MASS REPLACEMENT MODAL CONFIRMATION */}
      {invalidatingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
            <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              <span>Konfirmasi Mass Replacement</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tindakan ini akan menandai master account sebagai <strong>INVALID</strong> dan secara otomatis mengganti slot aktif customer yang terdampak ke stok akun shared yang masih tersedia.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvalidatingId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isInvalidating}
                onClick={() => handleInvalidate(invalidatingId)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                {isInvalidating ? 'Memproses...' : 'Ya, Invalidate & Replace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROTATE PASSWORD & RELEASE SLOTS MODAL */}
      {rotateModalOpen && rotatingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-400" />
                <span>Ganti Password &amp; Rilis Slot ({rotatingAccount.label})</span>
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
                <span>Rotasi Password Master Akun</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Silakan ubah password akun di platform resmi terlebih dahulu. Masukkan kredensial baru di bawah, lalu pilih slot mana saja yang ingin dirilis kembali menjadi <strong>AVAILABLE</strong> untuk dijual ke pembeli baru.
              </p>
              {rotatingAccount.masterExpiresAt && (
                <div className="text-[10px] text-cyan-400 pt-1 font-mono">
                  Masa Aktif Master: {formatDateJakarta(rotatingAccount.masterExpiresAt)}
                </div>
              )}
            </div>

            <form onSubmit={handleExecuteRotatePassword} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Password / Kredensial Master Baru <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newMasterCred}
                  onChange={(e) => setNewMasterCred(e.target.value)}
                  placeholder="email@example.com|password_baru atau format kredensial baru..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-300 flex items-center justify-between">
                  <span>Pilih Slot yang Ingin Dirilis ke AVAILABLE:</span>
                  <span className="text-[10px] text-slate-500">
                    ({selectedSlotIdsToRelease.length}/{rotatingAccount.slots?.length || 0} dipilih)
                  </span>
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {rotatingAccount.slots?.map((s: any) => {
                    const isChecked = selectedSlotIdsToRelease.includes(s.id);
                    const isExpired = s.status === 'EXPIRED' || (s.expiresAt && new Date(s.expiresAt) <= new Date());

                    return (
                      <label
                        key={s.id}
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
                                setSelectedSlotIdsToRelease((prev) => [...prev, s.id]);
                              } else {
                                setSelectedSlotIdsToRelease((prev) => prev.filter((id) => id !== s.id));
                              }
                            }}
                            className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                          />
                          <span className="font-bold font-mono">#{s.slotNumber} {s.slotLabel}</span>
                          {s.assignedUser?.email && (
                            <span className="text-[10px] text-slate-400 font-normal">({s.assignedUser.email})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isExpired && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[9px] font-bold">
                              Expired
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono font-bold">
                            {s.status}
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
                  disabled={isRotatingPassword || !newMasterCred.trim() || selectedSlotIdsToRelease.length === 0}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>{isRotatingPassword ? 'Memproses...' : 'Simpan & Rilis Slot'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
