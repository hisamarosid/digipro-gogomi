'use client';

import React, { useEffect, useState } from 'react';

interface LivePurchase {
  name: string;
  product: string;
  at: string;
}

const ROTATE_MS = 5000;
const REFRESH_MS = 120_000;

function timeAgo(iso: string, now: number): string {
  const diff = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diff < 60) return 'baru saja';
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

export function LivePurchaseTicker() {
  const [items, setItems] = useState<LivePurchase[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/store/live-purchases');
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setItems(json.data);
          setNow(Date.now());
        }
      } catch {
        /* decorative widget: ignore network errors */
      }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setVisible(true);
      }, 300);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;
  const item = items[index % items.length];

  return (
    <div className="border-t border-slate-800/80 bg-gradient-to-r from-rose-500/10 via-violet-500/10 to-transparent">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-xs sm:gap-3 sm:text-sm">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white sm:text-xs">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          Live
        </span>
        <p
          className={`min-w-0 truncate text-slate-300 transition-opacity duration-300 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span aria-hidden>🎉 </span>
          <span className="font-semibold text-slate-100">{item.name}</span>
          <span> baru membeli </span>
          <span className="font-bold text-cyan-400">{item.product}</span>
          <span className="text-slate-500"> · {timeAgo(item.at, now)}</span>
        </p>
      </div>
    </div>
  );
}
