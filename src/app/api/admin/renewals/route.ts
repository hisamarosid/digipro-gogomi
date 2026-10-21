import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { OrderStatus, SubscriptionStatus } from '../../../../../generated/prisma';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

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

    return NextResponse.json({
      success: true,
      data: {
        expiring7Days,
        renewalOrdersCount: paidRenewals.length,
        renewalRevenue,
        renewalRatePct,
        renewalOrders,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
