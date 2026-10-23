'use client';

import { useEffect, useState } from 'react';

let cached: string | null = null;
let inflight: Promise<string> | null = null;

function load(): Promise<string> {
  if (cached !== null) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch('/api/settings')
      .then((r) => r.json())
      .then((json) => {
        cached = json?.data?.SUPPORT_WHATSAPP || '';
        return cached as string;
      })
      .catch(() => '')
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** The store's WhatsApp number from admin settings (fetched once and shared by every card). */
export function useSupportWhatsapp(): string {
  const [number, setNumber] = useState<string>(cached ?? '');
  useEffect(() => {
    let alive = true;
    load().then((n) => {
      if (alive) setNumber(n);
    });
    return () => {
      alive = false;
    };
  }, []);
  return number;
}
