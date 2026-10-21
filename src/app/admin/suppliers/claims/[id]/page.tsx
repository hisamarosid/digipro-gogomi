import React from 'react';
import { notFound } from 'next/navigation';
import { SingleSupplierClaimAdminClient } from './SingleSupplierClaimAdminClient';

export const dynamic = 'force-dynamic';

export default async function SingleSupplierClaimPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  return <SingleSupplierClaimAdminClient claimId={id} />;
}
