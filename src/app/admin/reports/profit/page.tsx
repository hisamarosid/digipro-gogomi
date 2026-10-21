import React from 'react';
import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { AdminProfitReportClient } from './AdminProfitReportClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function ProfitReportPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission([
    PERMISSIONS.REPORTS_FINANCIAL,
    PERMISSIONS.REPORTS_VIEW,
  ]);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Laporan Finansial & Profit)"
        message="Akun Anda tidak memiliki izin untuk melihat laporan margin profit, COGS, atau analitik finansial toko."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  return <AdminProfitReportClient />;
}
