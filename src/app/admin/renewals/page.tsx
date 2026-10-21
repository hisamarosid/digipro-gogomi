import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { OrderStatus, SubscriptionStatus } from '../../../../generated/prisma';
import { AdminRenewalsClient } from './AdminRenewalsClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export default async function AdminRenewalsPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission(PERMISSIONS.RENEWAL_VIEW);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Pusat Renewal)"
        message="Akun Anda tidak memiliki izin untuk melihat atau memproses perpanjangan (renewal) langganan."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  const now = new Date();
  const threshold7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const expiring7Days = await db.subscription.count({
    where: {
      status: SubscriptionStatus.ACTIVE,
      expiresAt: { lte: threshold7d, gte: now },
    },
  });

  const renewalOrders = await db.order.findMany({
    where: { isRenewal: true },
    include: {
      user: { select: { name: true, email: true } },
      items: { include: { variant: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const paidRenewals = renewalOrders.filter(
    (o) => o.status === OrderStatus.PAID || o.status === OrderStatus.COMPLETED
  );

  const renewalRevenue = paidRenewals.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const totalEligibleExpired = await db.subscription.count({
    where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED] } },
  });

  const renewalRatePct =
    totalEligibleExpired > 0 ? ((paidRenewals.length / totalEligibleExpired) * 100).toFixed(1) : '0.0';

  return (
    <AdminRenewalsClient
      expiring7Days={expiring7Days}
      renewalOrdersCount={paidRenewals.length}
      renewalRevenue={renewalRevenue}
      renewalRatePct={renewalRatePct}
      renewalOrders={renewalOrders}
    />
  );
}
