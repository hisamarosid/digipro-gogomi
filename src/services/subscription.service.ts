import { db } from '@/lib/db/prisma';
import { SubscriptionStatus } from '../../generated/prisma';

export class SubscriptionService {
  /**
   * Syncs and ensures all paid order items belonging to a user have a corresponding Subscription record
   */
  static async syncSubscriptionsForUser(userId: string) {
    const unSyncedItems = await db.orderItem.findMany({
      where: {
        order: {
          userId,
          OR: [
            { paymentStatus: 'PAID' },
            { status: 'PAID' },
            { status: 'COMPLETED' },
          ],
        },
        subscriptions: { none: {} },
      },
      include: {
        order: true,
        variant: true,
      },
    });

    if (unSyncedItems.length === 0) return;

    for (const item of unSyncedItems) {
      const days = item.variant.subscriptionDays || item.variant.warrantyDays || 30;
      const expiresAt = new Date(item.order.createdAt.getTime() + days * 24 * 60 * 60 * 1000);
      const isExpired = expiresAt.getTime() < Date.now();

      await db.subscription.create({
        data: {
          userId,
          orderItemId: item.id,
          variantId: item.variantId,
          status: isExpired ? SubscriptionStatus.EXPIRED : SubscriptionStatus.ACTIVE,
          activatedAt: item.order.createdAt,
          expiresAt,
        },
      });
    }
  }

  /**
   * Syncs all paid order items globally across all users for admin view
   */
  static async syncAllSubscriptions() {
    const paidOrders = await db.order.findMany({
      where: {
        userId: { not: null },
        OR: [
          { paymentStatus: 'PAID' },
          { status: 'PAID' },
          { status: 'COMPLETED' },
        ],
      },
      include: {
        items: {
          include: {
            variant: true,
            subscriptions: true,
          },
        },
      },
    });

    for (const order of paidOrders) {
      if (!order.userId) continue;

      for (const item of order.items) {
        if (item.subscriptions.length === 0) {
          const days = item.variant.subscriptionDays || item.variant.warrantyDays || 30;
          const expiresAt = new Date(order.createdAt.getTime() + days * 24 * 60 * 60 * 1000);
          const isExpired = expiresAt.getTime() < Date.now();

          await db.subscription.create({
            data: {
              userId: order.userId,
              orderItemId: item.id,
              variantId: item.variantId,
              status: isExpired ? SubscriptionStatus.EXPIRED : SubscriptionStatus.ACTIVE,
              activatedAt: order.createdAt,
              expiresAt,
            },
          });
        }
      }
    }
  }
}
