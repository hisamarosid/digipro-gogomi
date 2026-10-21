import React from 'react';
import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { AdminSupplierClaimsClient } from './AdminSupplierClaimsClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function AdminSupplierClaimsPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission(PERMISSIONS.SUPPLIER_CLAIM_VIEW);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Klaim Garansi Supplier)"
        message="Akun Anda tidak memiliki izin untuk melihat atau mengelola klaim garansi supplier."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  return <AdminSupplierClaimsClient />;
}
