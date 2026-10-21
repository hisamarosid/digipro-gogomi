'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { validatePasswordStrength } from '@/lib/auth/validation';

interface PasswordStrengthChecklistProps {
  password: string;
}

export function PasswordStrengthChecklist({ password }: PasswordStrengthChecklistProps) {
  const result = validatePasswordStrength(password);

  const criteria = [
    { label: 'Minimal 8 karakter', met: result.hasMinLength },
    { label: 'Huruf besar (A-Z)', met: result.hasUppercase },
    { label: 'Huruf kecil (a-z)', met: result.hasLowercase },
    { label: 'Angka (0-9)', met: result.hasNumber },
    { label: 'Karakter khusus (!@#$ dll)', met: result.hasSpecial },
  ];

  if (!password) {
    return (
      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-[11px] text-slate-400">
        <span className="font-semibold text-slate-300 block mb-1">Syarat Keamanan Password:</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {criteria.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 text-slate-500">
              <div className="h-3.5 w-3.5 rounded-full border border-slate-700 flex items-center justify-center text-[9px]">
                •
              </div>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2 text-[11px]">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-300">Kekuatan Password:</span>
        <span
          className={`font-extrabold uppercase text-[10px] px-2 py-0.5 rounded-full ${
            result.isValid
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}
        >
          {result.isValid ? 'Kuat & Memenuhi Syarat' : 'Belum Memenuhi Syarat'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {criteria.map((c, i) => (
          <div
            key={i}
            className={`flex items-center gap-1.5 transition-colors ${
              c.met ? 'text-emerald-400 font-medium' : 'text-slate-500'
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                c.met
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {c.met ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : <X className="h-2.5 w-2.5" />}
            </div>
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
