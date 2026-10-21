'use client';

import React, { useState } from 'react';
import {
  Mail,
  Shield,
  Plus,
  Inbox,
  Sliders,
  CheckCircle2,
  Clock,
  KeyRound,
  Eye,
  RefreshCw,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateJakarta } from '@/lib/utils/formatters';

interface ProviderRule {
  id?: string;
  providerName: string;
  enabled: boolean;
  allowedSenders: string[];
  codeType: string;
  allowedCodeLengths: number[];
  codeTtlMinutes: number;
  recentLookbackMinutes: number;
}

interface MailboxItem {
  id: string;
  email: string;
  status: string;
  provider: string;
  lastWebhookAt?: string | null;
  lastReceivedAt?: string | null;
}

interface CodeEventItem {
  id: string;
  mailboxId?: string | null;
  provider: string;
  sender: string;
  subject: string;
  code: string;
  confidence: string;
  status: string;
  receivedAt: string;
}

export function AdminMailCenterClient({
  initialRules,
  initialMailboxes = [],
  initialEvents = [],
}: {
  initialRules: ProviderRule[];
  initialMailboxes?: MailboxItem[];
  initialEvents?: CodeEventItem[];
}) {
  const [activeTab, setActiveTab] = useState<'RULES' | 'MAILBOXES' | 'EVENTS'>('RULES');
  const [rules, setRules] = useState<ProviderRule[]>(initialRules);
  const [mailboxes] = useState<MailboxItem[]>(initialMailboxes);
  const [events] = useState<CodeEventItem[]>(initialEvents);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State for Adding/Editing Provider Rule
  const [providerName, setProviderName] = useState('');
  const [codeType, setCodeType] = useState('NUMERIC');
  const [codeLengthStr, setCodeLengthStr] = useState('4, 6');
  const [allowedSendersStr, setAllowedSendersStr] = useState('');
  const [ttlMinutes, setTtlMinutes] = useState('15');
  const [lookbackMinutes, setLookbackMinutes] = useState('5');

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/admin/verification-providers');
      const json = await res.json();
      if (res.ok && json.success) {
        setRules(json.data);
      }
    } catch {
      // Handle fetch error
    }
  };

  const handleOpenAddRule = () => {
    setIsEditing(false);
    setProviderName('');
    setCodeType('NUMERIC');
    setCodeLengthStr('4, 6');
    setAllowedSendersStr('');
    setTtlMinutes('15');
    setLookbackMinutes('5');
    setIsModalOpen(true);
  };

  const handleOpenEditRule = (rule: ProviderRule) => {
    setIsEditing(true);
    setProviderName(rule.providerName);
    setCodeType(rule.codeType || 'NUMERIC');
    setCodeLengthStr(Array.isArray(rule.allowedCodeLengths) ? rule.allowedCodeLengths.join(', ') : '4, 6');
    setAllowedSendersStr(Array.isArray(rule.allowedSenders) ? rule.allowedSenders.join(', ') : '');
    setTtlMinutes(String(rule.codeTtlMinutes || 15));
    setLookbackMinutes(String(rule.recentLookbackMinutes || 5));
    setIsModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName.trim()) {
      toast.error('Nama provider wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      const codeLengths = codeLengthStr
        .split(',')
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n));

      const senders = allowedSendersStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/verification-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerName: providerName.trim().toUpperCase(),
          enabled: true,
          codeType,
          allowedCodeLengths: codeLengths.length > 0 ? codeLengths : [4, 6],
          allowedSenders: senders,
          codeTtlMinutes: Number(ttlMinutes) || 15,
          recentLookbackMinutes: Number(lookbackMinutes) || 5,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan provider rule');
      }

      toast.success(`Provider Rule "${providerName.toUpperCase()}" berhasil disimpan!`);
      setIsModalOpen(false);
      setProviderName('');
      setAllowedSendersStr('');
      fetchRules();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan rule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-xl">Mail Center &amp; Verification Provider Rules</h1>
            <p className="text-xs text-slate-400">
              Kelola aturan parsing kode verifikasi (OTP), provider layanan, dan mailbox internal Gogomi.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddRule}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>TAMBAH PROVIDER RULE</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('RULES')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'RULES'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Provider Rules ({rules.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('MAILBOXES')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'MAILBOXES'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Inbox className="h-4 w-4" />
          <span>Gogomi Mailboxes ({mailboxes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('EVENTS')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'EVENTS'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>Log Kode Terbaca ({events.length})</span>
        </button>
      </div>

      {/* TAB 1: PROVIDER RULES */}
      {activeTab === 'RULES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.providerName}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative hover:border-slate-700 transition shadow-lg"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-cyan-400" />
                    <span className="font-extrabold text-white text-sm tracking-wide">{rule.providerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                      ACTIVE
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditRule(rule)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Edit Rule Provider"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Format Kode:</span>
                    <span className="font-mono text-white font-bold">{rule.codeType}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Panjang Kode:</span>
                    <span className="font-mono text-cyan-300 font-bold">
                      {Array.isArray(rule.allowedCodeLengths) ? rule.allowedCodeLengths.join(' / ') : '4 / 6'} Digit
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>TTL Kode:</span>
                    <span className="font-mono text-slate-300">{rule.codeTtlMinutes || 15} Menit</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Recent Lookback:</span>
                    <span className="font-mono text-slate-300">{rule.recentLookbackMinutes || 5} Menit</span>
                  </div>
                </div>

                {rule.allowedSenders && rule.allowedSenders.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-500 block">Allowed Sender Email:</span>
                    <p className="text-[11px] text-slate-300 font-mono truncate">{rule.allowedSenders.join(', ')}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MAILBOXES */}
      {activeTab === 'MAILBOXES' && (
        <div className="space-y-4">
          {mailboxes.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <Inbox className="h-8 w-8 text-cyan-400 mx-auto" />
              <h3 className="font-bold text-white text-sm">Belum Ada Mailbox Terhubung</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Mailbox Gogomi Mail akan terhubung &amp; tercatat otomatis begitu ada webhook email verifikasi yang masuk dari TMail ke endpoint toko Anda.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">Daftar Mailbox Gogomi Mail Terdaftar</h3>
                <span className="text-xs text-slate-400 font-mono">{mailboxes.length} Mailbox Aktif</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="p-3">Alamat Email Mailbox</th>
                      <th className="p-3">Provider Webhook</th>
                      <th className="p-3">Status Mailbox</th>
                      <th className="p-3">Email Terakhir Masuk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {mailboxes.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-cyan-300">{m.email}</td>
                        <td className="p-3 font-mono text-slate-300">{m.provider || 'TMAIL'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                            {m.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {m.lastReceivedAt ? formatDateJakarta(m.lastReceivedAt) : 'Belum Ada Email'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LOG KODE TERBACA */}
      {activeTab === 'EVENTS' && (
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <KeyRound className="h-8 w-8 text-cyan-400 mx-auto" />
              <h3 className="font-bold text-white text-sm">Belum Ada Log Kode Verifikasi</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Setiap email verifikasi yang masuk dan berhasil dibaca otomatis oleh sistem parser akan tercatat di sini beserta kode &amp; tingkat akurasinya.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">Log Kode Verifikasi Email Masuk (Inbound Events)</h3>
                <span className="text-xs text-cyan-400 font-mono font-bold">{events.length} Kode Ditemukan</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="p-3">Waktu Masuk</th>
                      <th className="p-3">Provider</th>
                      <th className="p-3">Pengirim &amp; Subjek</th>
                      <th className="p-3">Kode Verifikasi Extracted</th>
                      <th className="p-3">Confidence</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {events.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono text-slate-400 text-[11px]">
                          {ev.receivedAt ? formatDateJakarta(ev.receivedAt) : '-'}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/30">
                            {ev.provider}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs">
                          <div className="font-bold text-white text-xs truncate">{ev.subject}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">{ev.sender}</div>
                        </td>
                        <td className="p-3 font-mono font-black text-emerald-400 text-sm tracking-wider select-all">
                          {ev.code}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/20">
                            {ev.confidence}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-300">
                          {ev.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT PROVIDER RULE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveRule}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-sm uppercase">
                {isEditing ? 'EDIT PROVIDER RULE' : 'TAMBAH PROVIDER LAYANAN BARU'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Nama Provider Layanan *</label>
                <input
                  type="text"
                  required
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="Contoh: DISNEYPLUS, ZOOM, MICROSOFT"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Tipe Kode</label>
                  <select
                    value={codeType}
                    onChange={(e) => setCodeType(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500"
                  >
                    <option value="NUMERIC">NUMERIC (Angka)</option>
                    <option value="ALPHANUMERIC">ALPHANUMERIC</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Panjang Digit (Pisah koma)</label>
                  <input
                    type="text"
                    value={codeLengthStr}
                    onChange={(e) => setCodeLengthStr(e.target.value)}
                    placeholder="4, 6"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Allowed Sender Email (Opsional)</label>
                <input
                  type="text"
                  value={allowedSendersStr}
                  onChange={(e) => setAllowedSendersStr(e.target.value)}
                  placeholder="info@account.netflix.com, @adobe.com"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Code TTL (Menit)</label>
                  <input
                    type="number"
                    value={ttlMinutes}
                    onChange={(e) => setTtlMinutes(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Recent Lookback (Menit)</label>
                  <input
                    type="number"
                    value={lookbackMinutes}
                    onChange={(e) => setLookbackMinutes(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition text-xs shadow-md shadow-cyan-500/20"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Provider Rule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
