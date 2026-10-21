'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, FileText, Lock, LifeBuoy, HelpCircle } from 'lucide-react';

export function PolicyHeader({ title, description }: { title: string; description: string }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Pusat Bantuan (Helpdesk)', href: '/help', icon: LifeBuoy },
    { name: 'Syarat & Ketentuan', href: '/terms', icon: FileText },
    { name: 'Kebijakan Privasi', href: '/privacy', icon: Lock },
    { name: 'Kebijakan Garansi & Refund', href: '/refund-policy', icon: ShieldCheck },
    { name: 'FAQ (Tanya Jawab)', href: '/faq', icon: HelpCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Gogomi Store Customer Protection & Legal Policy</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{title}</h1>
        <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">{description}</p>

        <div className="pt-2 text-[11px] text-slate-400 font-mono">
          Terakhir Diperbarui: <span className="text-slate-200 font-semibold">15 Agustus 2026</span> • Versi Dokumen: <span className="text-blue-600 dark:text-cyan-400 font-bold">v2.4-LEGAL</span>
        </div>
      </div>

      {/* Policy Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800/80 text-xs no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition whitespace-nowrap font-bold ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-blue-600 dark:text-cyan-400'}`} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
