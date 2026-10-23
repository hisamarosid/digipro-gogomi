import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { ClaimAccountClient } from './ClaimAccountClient';

export const metadata: Metadata = {
  title: 'Aktifkan Akun - Gogomi Store',
  robots: { index: false, follow: false },
};

export default function ClaimAccountPage() {
  return (
    <Suspense fallback={null}>
      <ClaimAccountClient />
    </Suspense>
  );
}
