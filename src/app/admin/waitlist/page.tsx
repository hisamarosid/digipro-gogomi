import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { WaitlistStatus } from '../../../../generated/prisma';
import { WaitlistService } from '@/services/waitlist.service';
import { AdminWaitlistClient } from './AdminWaitlistClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export default async function AdminWaitlistPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission([
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.PRODUCT_VIEW,
  ]);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Waitlist Restok)"
        message="Akun Anda tidak memiliki izin untuk melihat data antrean waitlist restok produk."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  const waitlists = await db.productWaitlist.findMany({
    include: {
      user: { select: { name: true, email: true } },
      variant: {
        include: { product: { select: { name: true, slug: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const activeWaitlistCount = waitlists.filter((w) => w.status === WaitlistStatus.ACTIVE).length;
  const notifiedCount = waitlists.filter((w) => w.status === WaitlistStatus.NOTIFIED).length;
  const convertedCount = waitlists.filter((w) => w.status === WaitlistStatus.CONVERTED).length;

  const conversionRatePct =
    notifiedCount > 0 ? ((convertedCount / notifiedCount) * 100).toFixed(1) : '0.0';

  const variantDemandMap = new Map<string, { variantName: string; count: number; price: number; stock: number }>();

  for (const w of waitlists.filter((item) => item.status === WaitlistStatus.ACTIVE)) {
    const key = w.productVariantId;
    const variantName = `${w.variant?.product?.name || 'Produk'} - ${w.variant?.name || 'Varian'}`;
    const price = w.variant?.price || 0;

    if (!variantDemandMap.has(key)) {
      const stock = await WaitlistService.getEligibleStockCount(key);
      variantDemandMap.set(key, { variantName, count: 1, price, stock });
    } else {
      const item = variantDemandMap.get(key)!;
      item.count += 1;
    }
  }

  const demandList = Array.from(variantDemandMap.entries()).map(([variantId, d]) => ({
    variantId,
    variantName: d.variantName,
    activeWaitlistCount: d.count,
    eligibleStock: d.stock,
    unitPrice: d.price,
    potentialGrossValue: d.count * d.price,
  }));

  return (
    <AdminWaitlistClient
      activeWaitlistCount={activeWaitlistCount}
      notifiedCount={notifiedCount}
      convertedCount={convertedCount}
      conversionRatePct={conversionRatePct}
      demandList={demandList}
      waitlists={waitlists}
    />
  );
}
