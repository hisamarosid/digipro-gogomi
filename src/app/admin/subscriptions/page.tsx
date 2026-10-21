import React from 'react';
import { db } from '@/lib/db/prisma';
import { AdminSubscriptionsClient } from './AdminSubscriptionsClient';
import { SubscriptionService } from '@/services/subscription.service';
import { formatRevealedPayload } from '@/lib/security/encryption';

export const dynamic = 'force-dynamic';

export default async function AdminSubscriptionsPage() {
  let subscriptions: any[] = [];

  try {
    // Auto sync all subscriptions from paid order items first
    await SubscriptionService.syncAllSubscriptions();

    const rawSubscriptions = await db.subscription.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        variant: {
          include: {
            product: { select: { id: true, name: true, slug: true } },
          },
        },
        orderItem: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                grandTotal: true,
                createdAt: true,
              },
            },
            fulfillments: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: { id: true, payloadRevealed: true, deliveredAt: true, status: true, deliveryType: true },
            },
          },
        },
      },
      orderBy: { expiresAt: 'asc' },
      take: 200,
    });

    subscriptions = rawSubscriptions.map((sub: any) => ({
      ...sub,
      orderItem: sub.orderItem
        ? {
            ...sub.orderItem,
            fulfillments: sub.orderItem.fulfillments?.map((f: any) => ({
              ...f,
              payloadRevealed: f.payloadRevealed ? formatRevealedPayload(f.payloadRevealed) : f.payloadRevealed,
            })),
          }
        : sub.orderItem,
    }));
  } catch (err) {
    console.error('AdminSubscriptionsPage sync error:', err);
  }

  return <AdminSubscriptionsClient subscriptions={subscriptions} />;
}
