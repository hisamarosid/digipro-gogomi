'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 transition shadow-sm"
      aria-label="Toggle Dark/Light Mode"
      title={theme === 'dark' ? 'Switch to Light Mode ☀️' : 'Switch to Dark Mode 🌙'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-amber-400 animate-in spin-in-180 duration-300" />
      ) : (
        <Moon className="h-4 w-4 text-cyan-500 animate-in spin-in-180 duration-300" />
      )}
    </button>
  );
}
