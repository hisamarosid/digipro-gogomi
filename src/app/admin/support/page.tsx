import React from 'react';
import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { AdminSupportClient } from './AdminSupportClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function AdminSupportPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission(PERMISSIONS.SUPPORT_VIEW);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Tiket Support CS)"
        message="Akun Anda tidak memiliki izin untuk melihat atau mengelola tiket bantuan customer support."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  let tickets: any[] = [];
  let customers: any[] = [];

  try {
    tickets = await db.supportTicket.findMany({
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { orderNumber: true } },
        messages: {
          include: { sender: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    customers = await db.user.findMany({
      where: { role: 'CUSTOMER' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  } catch {}

  return <AdminSupportClient tickets={tickets} customers={customers} />;
}
