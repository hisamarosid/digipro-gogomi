import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';
import { PermissionService } from '@/services/permission.service';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    redirect('/login');
  }

  let effectivePermissions: string[] = [];
  try {
    const userPerms = await PermissionService.getUserPermissions(session.userId);
    effectivePermissions = userPerms.effectivePermissions;
  } catch {}

  const fullSession = {
    ...session,
    permissions: effectivePermissions,
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased">
      {/* Admin Desktop Sidebar Navigation */}
      <AdminSidebar session={fullSession} />

      {/* Main Admin Content Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AdminHeader session={fullSession} />
        <main className="p-4 sm:p-6 md:p-8 flex-1">{children}</main>
      </div>
    </div>
  );
}
