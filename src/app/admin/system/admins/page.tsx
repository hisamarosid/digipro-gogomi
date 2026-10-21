import React from 'react';
import { getCurrentSession } from '@/lib/auth/session';
import { PermissionService } from '@/services/permission.service';
import { AdminManagementClient } from './AdminManagementClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function AdminManagementPage() {
  const session = await getCurrentSession();

  if (!session || session.role !== 'SUPER_ADMIN') {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Khusus Super Admin)"
        message="Halaman Manajemen Administrator & Hak Akses hanya dapat dikelola secara eksklusif oleh Super Admin."
        userRole={session?.role || 'GUEST'}
        requiredPermission="Role: SUPER_ADMIN"
      />
    );
  }

  const admins = await PermissionService.listAdmins();

  return <AdminManagementClient initialAdmins={admins as any} currentUserId={session.userId} />;
}
