'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

export function SupplierPoliciesClient() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [policyName, setPolicyName] = useState('30 Day Full Warranty Policy');
  const [warrantyDays, setWarrantyDays] = useState(30);
  const [claimDeadlineDays, setClaimDeadlineDays] = useState(30);
  const [defaultInstructions, setDefaultInstructions] = useState('');

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const [resPol, resSup] = await Promise.all([
        fetch('/api/admin/suppliers/policies'),
        fetch('/api/admin/suppliers'),
      ]);
      const jsonPol = await resPol.json();
      const jsonSup = await resSup.json();

      if (jsonPol.success) setPolicies(jsonPol.data);
      if (jsonSup.success) {
        setSuppliers(jsonSup.data);
        if (jsonSup.data.length > 0) setSelectedSupplierId(jsonSup.data[0].id);
      }
    } catch {
      toast.error('Gagal memuat kebijakan garansi supplier');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !policyName.trim()) {
      toast.error('Supplier dan Nama Kebijakan wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/suppliers/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          name: policyName.trim(),
          warrantyDays,
          claimDeadlineDays,
          defaultClaimInstructions: defaultInstructions,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Kebijakan garansi ${json.data.name} berhasil ditambahkan!`);
        setIsModalOpen(false);
        fetchPolicies();
      } else {
        toast.error(`Gagal: ${json.error}`);
      }
    } catch {
      toast.error('Gagal membuat kebijakan garansi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/suppliers"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Manajemen Supplier</span>
          </Link>

          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-cyan-400" />
            <span>Kebijakan Garansi Supplier (Supplier Warranty Policies)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Atur durasi garansi vendor, batas waktu klaim, dan template pengajuan garansi resmi per supplier.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Kebijakan Garansi Baru</span>
        </button>
      </div>

      {/* Policy List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="p-8 col-span-full text-center text-slate-400">
            <div className="animate-spin h-6 w-6 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-2" />
            Memuat kebijakan garansi...
          </div>
        ) : policies.length === 0 ? (
          <div className="p-8 col-span-full text-center text-slate-400 rounded-3xl glass-panel border border-slate-800 bg-slate-900/60">
            Belum ada kebijakan garansi supplier yang dibuat.
          </div>
        ) : (
          policies.map((pol) => (
            <div key={pol.id} className="p-6 rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                  {pol.supplier?.code || 'SUP-000'}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                  {pol.status}
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-base text-white">{pol.name}</h3>
                <p className="text-slate-400 text-xs mt-0.5">Supplier: <strong className="text-white">{pol.supplier?.name}</strong></p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Masa Garansi Supplier:</span>
                  <span className="font-bold text-white">{pol.warrantyDays || 30} Hari</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Batas Klaim Max:</span>
                  <span className="font-bold text-cyan-300">{pol.claimDeadlineDays || 30} Hari</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Create Policy */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <form onSubmit={handleCreatePolicy} className="w-full max-w-md rounded-3xl glass-panel border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Tambah Kebijakan Garansi Supplier</h3>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Pilih Supplier:</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.code}] {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Nama Kebijakan Garansi:</label>
              <input
                type="text"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Masa Garansi (Hari):</label>
                <input
                  type="number"
                  value={warrantyDays}
                  onChange={(e) => setWarrantyDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Batas Klaim (Hari):</label>
                <input
                  type="number"
                  value={claimDeadlineDays}
                  onChange={(e) => setClaimDeadlineDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold flex items-center gap-2"
              >
                {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                <span>Simpan Kebijakan</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
