'use client';

import React from 'react';
import { Plus, MessageCircle } from 'lucide-react';
import { useSupportWhatsapp } from '@/lib/hooks/useSupportWhatsapp';
import { buildWhatsappLink } from '@/lib/utils/whatsapp';

/** Last card of the Jasa Digital list: for needs that are not listed. */
export function ServiceChatCard() {
  const whatsapp = useSupportWhatsapp();
  const link = buildWhatsappLink(whatsapp, 'Halo admin Gogomi, saya butuh jasa digital yang belum ada di daftar. Bisa dibantu?');
  if (!link) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
        <Plus className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold text-white">Tanya jasa lainnya</h3>
      <p className="text-xs text-slate-400 leading-relaxed">Punya kebutuhan lain? Chat admin, kami bantu carikan solusinya.</p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 px-5 py-2.5 text-xs font-bold text-white transition"
      >
        <MessageCircle className="h-4 w-4" />
        <span>Chat Admin</span>
      </a>
    </div>
  );
}
