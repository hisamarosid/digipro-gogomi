import React from 'react';
import { AdminSupplierDetailClient } from './AdminSupplierDetailClient';

export default async function AdminSupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminSupplierDetailClient supplierId={id} />;
}
