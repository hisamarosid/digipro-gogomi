'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center rounded-full bg-slate-900 border border-slate-800/90 p-1 text-xs font-bold shadow-sm">
      <button
        onClick={() => setLanguage('id')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all ${
          language === 'id'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black'
            : 'text-slate-400 hover:text-white'
        }`}
        title="Bahasa Indonesia"
      >
        <span>🇮🇩</span>
        <span>ID</span>
      </button>

      <button
        onClick={() => setLanguage('en')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all ${
          language === 'en'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black'
            : 'text-slate-400 hover:text-white'
        }`}
        title="English"
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>
    </div>
  );
}
