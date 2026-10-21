import React from 'react';
import { db } from '@/lib/db/prisma';
import { AdminCouponsClient } from './AdminCouponsClient';

export const dynamic = 'force-dynamic';

export default async function AdminCouponsPage() {
  let coupons: any[] = [];
  let summary = {
    totalCount: 0,
    activeCount: 0,
    inactiveCount: 0,
    totalDiscountGiven: 0,
  };

  try {
    coupons = await db.coupon.findMany({
      include: {
        _count: { select: { couponUsages: true, orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalCount = coupons.length;
    const activeCount = coupons.filter((c) => c.active).length;
    const inactiveCount = coupons.filter((c) => !c.active).length;

    const orderDiscounts = await db.order.aggregate({
      _sum: { discountAmount: true },
      where: { couponId: { not: null } },
    });

    summary = {
      totalCount,
      activeCount,
      inactiveCount,
      totalDiscountGiven: orderDiscounts._sum.discountAmount || 0,
    };
  } catch {}

  return <AdminCouponsClient coupons={coupons} summary={summary} />;
}
