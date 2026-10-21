import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { FeatureFlagService } from '@/services/featureFlag.service';
import { db } from '@/lib/db/prisma';
import { FeatureManagementClient } from './FeatureManagementClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function FeatureManagementPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission(PERMISSIONS.FEATURE_FLAGS_MANAGE);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Feature Flags)"
        message="Anda tidak memiliki izin untuk mengubah status modul dan fitur sistem."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  const [flags, auditLogs] = await Promise.all([
    FeatureFlagService.getAllFlags(),
    db.auditLog.findMany({
      where: { entity: 'FEATURE_FLAG' },
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { timestamp: 'desc' },
      take: 20,
    }),
  ]);

  return <FeatureManagementClient initialFlags={flags} initialAuditLogs={auditLogs} />;
}
