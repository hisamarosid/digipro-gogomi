import React from 'react';
import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { AdminPaymentsClient } from './AdminPaymentsClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission(PERMISSIONS.PAYMENT_VIEW);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Pembayaran QRIS)"
        message="Akun Anda tidak memiliki izin untuk melihat log transaksi atau status pembayaran QRIS."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  let payments: any[] = [];
  let paymentLogs: any[] = [];

  try {
    payments = await db.payment.findMany({
      include: {
        order: {
          select: {
            orderNumber: true,
            grandTotal: true,
            user: { select: { name: true, email: true } },
            guestEmail: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    paymentLogs = await db.paymentLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  } catch {}

  return <AdminPaymentsClient payments={payments} paymentLogs={paymentLogs} />;
}
