import React from 'react';
import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { AdminAuditLogsClient } from './AdminAuditLogsClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function AdminAuditLogsPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission(PERMISSIONS.AUDIT_VIEW);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Audit Logs)"
        message="Akun Anda tidak memiliki izin untuk melihat riwayat audit log aktivitas sistem."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  let logs: any[] = [];
  try {
    logs = await db.auditLog.findMany({
      take: 100,
      orderBy: { timestamp: 'desc' },
      include: {
        actor: { select: { name: true, email: true, role: true } },
      },
    });
  } catch {}

  return <AdminAuditLogsClient logs={logs} />;
}
