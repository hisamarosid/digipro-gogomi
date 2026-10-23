import React from 'react';
import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { InvoiceLinkClient } from './InvoiceLinkClient';

export const dynamic = 'force-dynamic';

export default async function AdminInvoiceLinkPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission(PERMISSIONS.ORDER_UPDATE);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Buat Tagihan)"
        message="Akun Anda tidak memiliki izin untuk membuat tagihan jasa."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  return <InvoiceLinkClient />;
}
