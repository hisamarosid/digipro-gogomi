import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { WaitlistStatus } from '../../../../../generated/prisma';
import { WaitlistService } from '@/services/waitlist.service';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

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

    // Calculate potential demand valuation per variant
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

    return NextResponse.json({
      success: true,
      data: {
        activeWaitlistCount,
        notifiedCount,
        convertedCount,
        conversionRatePct,
        demandList,
        waitlists,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
