import React from 'react';
import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { AdminSuppliersClient } from './AdminSuppliersClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function AdminSuppliersPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission(PERMISSIONS.SUPPLIER_VIEW);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Manajemen Supplier)"
        message="Akun Anda tidak memiliki izin untuk melihat atau mengelola daftar supplier/vendor."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  return <AdminSuppliersClient />;
}
