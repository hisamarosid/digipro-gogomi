import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { TrackOrderClient } from './TrackOrderClient';

export const metadata: Metadata = {
  title: 'Lacak Pesanan - Gogomi Store',
  description: 'Cek status pesanan dan buka kembali produk digital Anda tanpa perlu login.',
  robots: { index: false, follow: true },
};

export default function TrackOrderPage() {
  return (
    <Suspense fallback={null}>
      <TrackOrderClient />
    </Suspense>
  );
}
