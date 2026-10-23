import React from 'react';
import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { AdminOrdersClient } from './AdminOrdersClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { formatRevealedPayload } from '@/lib/security/encryption';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission(PERMISSIONS.ORDER_VIEW);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Daftar Pesanan)"
        message="Akun Anda tidak memiliki izin untuk mengakses data transaksi dan daftar pesanan."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  let orders: any[] = [];

  try {
    const rawOrders = await db.order.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, name: true, slug: true } },
              },
            },
            fulfillments: {
              select: { id: true, status: true, payloadRevealed: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        payments: {
          select: { id: true, provider: true, status: true, amount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    orders = rawOrders.map((ord) => ({
      ...ord,
      items: ord.items?.map((item: any) => ({
        ...item,
        fulfillments: item.fulfillments?.map((f: any) => ({
          ...f,
          payloadRevealed: f.payloadRevealed ? formatRevealedPayload(f.payloadRevealed) : f.payloadRevealed,
        })),
      })),
    }));
  } catch (err) {
    console.error('AdminOrdersPage fetch error:', err);
  }

  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat daftar pesanan...</div>}>
      <AdminOrdersClient orders={orders} />
    </React.Suspense>
  );
}
