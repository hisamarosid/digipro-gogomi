import React from 'react';
import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { PermissionMatrixClient } from './PermissionMatrixClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function PermissionMatrixPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission(PERMISSIONS.PERMISSION_MANAGE);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Izin Khusus)"
        message="Anda tidak memiliki izin untuk mengelola matriks peran dan hak akses sistem."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  return <PermissionMatrixClient />;
}
