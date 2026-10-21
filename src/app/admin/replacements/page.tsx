import React from 'react';
import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { AdminReplacementsClient } from './AdminReplacementsClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function AdminReplacementsPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission(PERMISSIONS.REPLACEMENT_VIEW);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Auto Replacements)"
        message="Akun Anda tidak memiliki izin untuk melihat atau memproses permohonan garansi penggantian akun."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  return <AdminReplacementsClient />;
}
