import React from 'react';
import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { SiteSettingService } from '@/services/siteSetting.service';
import { AdminSettingsClient } from './AdminSettingsClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission([
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
  ]);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Pengaturan Toko)"
        message="Akun Anda tidak memiliki izin untuk melihat atau mengubah pengaturan umum toko."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  const initialSettings = await SiteSettingService.getAllSettings();

  return <AdminSettingsClient initialSettings={initialSettings} />;
}
