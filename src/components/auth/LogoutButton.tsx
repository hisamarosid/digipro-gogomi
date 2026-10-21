'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LogoutButtonProps {
  className?: string;
  variant?: 'sidebar' | 'header' | 'button' | 'text';
  showLabel?: boolean;
}

export function LogoutButton({
  className = '',
  variant = 'button',
  showLabel = true,
}: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        toast.success('Berhasil keluar dari akun');
        router.push('/');
        router.refresh();
      } else {
        toast.error('Gagal keluar dari akun');
      }
    } catch {
      toast.error('Terjadi kesalahan saat logout');
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'sidebar') {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition text-xs font-bold ${className}`}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-rose-400" /> : <LogOut className="h-4 w-4 text-rose-400" />}
        {showLabel && <span>Keluar dari Akun</span>}
      </button>
    );
  }

  if (variant === 'header') {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        title="Keluar / Logout"
        className={`flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition ${className}`}
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
        {showLabel && <span className="hidden sm:inline">Keluar</span>}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition disabled:opacity-50 ${className}`}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      {showLabel && <span>Keluar (Logout)</span>}
    </button>
  );
}
