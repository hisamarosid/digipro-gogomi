'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, Mail, ExternalLink, HelpCircle, Shield, Globe } from 'lucide-react';

export interface VerificationAccessState {
  verificationRequired: boolean;
  verificationMethod: 'NONE' | 'EXTERNAL_INBOX_URL' | 'GOGOMI_MAIL' | 'MANUAL';
  verificationEmail: string;
  verificationAccessUrl: string;
  verificationMailboxId: string;
  verificationProvider: string;
  verificationInstructions: string;
}

interface VerificationAccessConfigSectionProps {
  value: VerificationAccessState;
  onChange: (value: VerificationAccessState) => void;
}

export function VerificationAccessConfigSection({
  value,
  onChange,
}: VerificationAccessConfigSectionProps) {
  const [providerRules, setProviderRules] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/verification-providers', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && Array.isArray(json.data)) {
          setProviderRules(json.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const updateField = (field: keyof VerificationAccessState, val: any) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-cyan-400" />
          <h4 className="font-bold text-xs text-white uppercase tracking-wider">VERIFICATION ACCESS CONFIGURATION</h4>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-[11px] font-bold text-slate-300">Requires Verification:</span>
          <input
            type="checkbox"
            checked={value.verificationRequired}
            onChange={(e) => updateField('verificationRequired', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500 relative"></div>
          <span className={`text-[10px] font-extrabold ${value.verificationRequired ? 'text-cyan-400' : 'text-slate-500'}`}>
            {value.verificationRequired ? 'ON' : 'OFF'}
          </span>
        </label>
      </div>

      {value.verificationRequired && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Method Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 block">Metode Verifikasi (Verification Method)</label>
            <select
              value={value.verificationMethod}
              onChange={(e) => updateField('verificationMethod', e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-cyan-500"
            >
              <option value="NONE">NONE (Tanpa Verifikasi)</option>
              <option value="EXTERNAL_INBOX_URL">EXTERNAL_INBOX_URL (Link Inbox Eksternal Supplier)</option>
              <option value="GOGOMI_MAIL">GOGOMI_MAIL (Otomatis via Webhook Email Gogomi)</option>
              <option value="MANUAL">MANUAL (Bantuan Support Admin)</option>
            </select>
          </div>

          {/* Dynamic Fields for EXTERNAL_INBOX_URL */}
          {value.verificationMethod === 'EXTERNAL_INBOX_URL' && (
            <div className="space-y-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">Verification Email (Secondary Email)</label>
                <input
                  type="email"
                  value={value.verificationEmail}
                  onChange={(e) => updateField('verificationEmail', e.target.value)}
                  placeholder="secondary@outlook.com"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">External Inbox URL</label>
                <input
                  type="url"
                  value={value.verificationAccessUrl}
                  onChange={(e) => updateField('verificationAccessUrl', e.target.value)}
                  placeholder="https://trackmail.vendor.com/inbox/..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">Petunjuk Tambahan (Optional)</label>
                <input
                  type="text"
                  value={value.verificationInstructions}
                  onChange={(e) => updateField('verificationInstructions', e.target.value)}
                  placeholder="Buka inbox di atas lalu salin kode 6 digit"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {/* Dynamic Fields for GOGOMI_MAIL */}
          {value.verificationMethod === 'GOGOMI_MAIL' && (
            <div className="space-y-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 block">Verification Email (Secondary Email)</label>
                  <input
                    type="email"
                    value={value.verificationEmail}
                    onChange={(e) => updateField('verificationEmail', e.target.value)}
                    placeholder="adobe01@gogomi.shop"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 block">Provider Layanan</label>
                  <select
                    value={value.verificationProvider}
                    onChange={(e) => updateField('verificationProvider', e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white text-xs font-bold focus:outline-none focus:border-cyan-500"
                  >
                    {providerRules.length > 0 ? (
                      providerRules.map((r) => (
                        <option key={r.providerName} value={r.providerName}>
                          {r.providerName} ({r.codeType || 'OTP'})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="NETFLIX">NETFLIX (4-digit Sign-in code)</option>
                        <option value="ADOBE">ADOBE (6-digit OTP)</option>
                        <option value="CANVA">CANVA (6-digit OTP)</option>
                        <option value="SPOTIFY">SPOTIFY (6-digit OTP)</option>
                        <option value="CHATGPT">CHATGPT / OPENAI</option>
                        <option value="CLAUDE">CLAUDE / ANTHROPIC</option>
                        <option value="DISNEYPLUS">DISNEYPLUS (OTP)</option>
                        <option value="ZOOM">ZOOM (OTP)</option>
                        <option value="MICROSOFT">MICROSOFT (OTP)</option>
                        <option value="OTHER">OTHER (General Context Matcher)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">Linked Gogomi Mailbox ID / Email</label>
                <input
                  type="text"
                  value={value.verificationMailboxId}
                  onChange={(e) => updateField('verificationMailboxId', e.target.value)}
                  placeholder="adobe01@gogomi.shop"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Dynamic Fields for MANUAL */}
          {value.verificationMethod === 'MANUAL' && (
            <div className="space-y-1 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <label className="text-[11px] font-bold text-slate-300 block">Instruksi Support</label>
              <input
                type="text"
                value={value.verificationInstructions}
                onChange={(e) => updateField('verificationInstructions', e.target.value)}
                placeholder="Hubungi Support untuk mendapatkan kode verifikasi"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
