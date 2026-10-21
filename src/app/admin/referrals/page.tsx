import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { ReferralStatus } from '../../../../generated/prisma';
import { AdminReferralsClient } from './AdminReferralsClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export default async function AdminReferralsPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission([
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ]);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Program Referral)"
        message="Akun Anda tidak memiliki izin untuk melihat metrik atau data program referral."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  const rewards = await db.referralReward.findMany({
    include: {
      referrer: { select: { name: true, email: true, referralCode: true } },
      referred: { select: { name: true, email: true, createdAt: true } },
      riskFlags: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalRegistrations = await db.user.count({
    where: { referredByUserId: { not: null } },
  });

  const qualifiedCount = rewards.filter((r) => r.status === ReferralStatus.QUALIFIED || r.status === ReferralStatus.REWARDED).length;
  const pendingCount = rewards.filter((r) => r.status === ReferralStatus.PENDING).length;
  const totalCoinsIssued = rewards
    .filter((r) => r.status === ReferralStatus.REWARDED)
    .reduce((sum, r) => sum + r.referrerCoins + r.newCustomerCoins, 0);

  const conversionRatePct =
    totalRegistrations > 0 ? ((qualifiedCount / totalRegistrations) * 100).toFixed(1) : '0.0';

  return (
    <AdminReferralsClient
      totalRegistrations={totalRegistrations}
      qualifiedCount={qualifiedCount}
      pendingCount={pendingCount}
      totalCoinsIssued={totalCoinsIssued}
      conversionRatePct={conversionRatePct}
      rewards={rewards}
    />
  );
}
