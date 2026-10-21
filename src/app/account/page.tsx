import React from 'react';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { LoyaltyService } from '@/services/loyalty.service';
import { CustomerDashboardClient } from '@/app/account/CustomerDashboardClient';

export default async function CustomerDashboardPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const [ordersCount, activeProductsCount, subscriptionsCount, coinBalance, recentOrders] = await Promise.all([
    db.order.count({ where: { userId: session.userId } }),
    db.fulfillment.count({
      where: { orderItem: { order: { userId: session.userId } }, status: { in: ['ACTIVE', 'FULFILLED'] } },
    }),
    db.subscription.count({
      where: { userId: session.userId, status: 'ACTIVE' },
    }),
    LoyaltyService.getAvailableCoinBalance(session.userId),
    db.order.findMany({
      where: { userId: session.userId },
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        grandTotal: true,
        status: true,
      },
    }),
  ]);

  return (
    <CustomerDashboardClient
      sessionName={session.name}
      ordersCount={ordersCount}
      activeProductsCount={activeProductsCount}
      subscriptionsCount={subscriptionsCount}
      coinBalance={coinBalance}
      recentOrders={recentOrders}
    />
  );
}
