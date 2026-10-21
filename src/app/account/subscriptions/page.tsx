import React from 'react';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { SubscriptionService } from '@/services/subscription.service';
import { CustomerSubscriptionsClient } from './CustomerSubscriptionsClient';
import { OrderService } from '@/services/order.service';

export const dynamic = 'force-dynamic';

export default async function CustomerSubscriptionsPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  try {
    // Proactively auto-claim any guest orders placed with this email
    await OrderService.claimGuestOrdersForUser(session.userId, session.email);
    // Auto-sync customer subscriptions from paid orders
    await SubscriptionService.syncSubscriptionsForUser(session.userId);
  } catch (err) {
    console.error('CustomerSubscriptionsPage auto-sync error:', err);
  }

  const subscriptions = await db.subscription.findMany({
    where: { userId: session.userId },
    include: {
      variant: {
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          subscriptionDays: true,
          warrantyDays: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
            },
          },
        },
      },
    },
    orderBy: { expiresAt: 'asc' },
  });

  return <CustomerSubscriptionsClient subscriptions={subscriptions} />;
}
