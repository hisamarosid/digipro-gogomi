import React from 'react';
import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { AdminCustomersClient } from './AdminCustomersClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission(PERMISSIONS.CUSTOMER_VIEW);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Data Pelanggan)"
        message="Akun Anda tidak memiliki izin untuk melihat profil atau data pelanggan."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  let customers: any[] = [];

  try {
    const rawCustomers = await db.user.findMany({
      include: {
        orders: {
          select: { id: true, orderNumber: true, status: true, grandTotal: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        subscriptions: {
          select: { id: true, status: true, expiresAt: true, variant: { select: { name: true, product: { select: { name: true } } } } },
          orderBy: { expiresAt: 'asc' },
        },
        _count: {
          select: { orders: true, subscriptions: true, reviews: true, replacementRequests: true, supportTickets: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    customers = rawCustomers.map((user: any) => {
      const totalSpent = (user.orders || [])
        .filter((o: any) => o.status === 'COMPLETED' || o.status === 'PAID')
        .reduce((sum: number, o: any) => sum + (o.grandTotal || 0), 0);

      const activeSubCount = (user.subscriptions || []).filter(
        (s: any) => s.status === 'ACTIVE' && new Date(s.expiresAt) > new Date()
      ).length;

      return {
        ...user,
        totalSpent,
        activeSubCount,
      };
    });
  } catch (err) {
    console.error('AdminCustomersPage fetch error:', err);
  }

  return <AdminCustomersClient customers={customers} />;
}
