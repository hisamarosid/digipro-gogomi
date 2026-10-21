import { db } from '@/lib/db/prisma';
import {
  DeliveryModel,
  OrderStatus,
  PaymentStatus,
  RenewalFulfillmentMode,
  SharedAccountStatus,
  SharedSlotStatus,
  SubscriptionStatus,
} from '../../generated/prisma';
import { SharedAccountService } from './sharedAccount.service';
import { DomainEventService } from './domainEvent.service';
import { PaymentService } from './payment.service';

export interface CustomerRenewalsOverview {
  expiringSoon: any[];
  activeProducts: any[];
  expiredProducts: any[];
  renewalHistory: any[];
}

export class RenewalService {
  /**
   * Retrieves customer subscription renewals grouped into sections
   */
  static async getExpiringSubscriptionsForCustomer(
    userId: string,
    expiringSoonDays = 7
  ): Promise<CustomerRenewalsOverview> {
    const [subscriptions, renewalHistory] = await Promise.all([
      db.subscription.findMany({
        where: { userId },
        include: {
          variant: {
            include: {
              product: { select: { name: true, thumbnail: true, slug: true } },
            },
          },
          orderItem: {
            include: {
              order: { select: { orderNumber: true, createdAt: true } },
            },
          },
        },
        orderBy: { expiresAt: 'asc' },
      }),
      db.order.findMany({
        where: {
          userId,
          isRenewal: true,
          status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] },
        },
        include: {
          items: {
            include: {
              variant: { select: { id: true, name: true, sku: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const now = new Date();
    const expiringSoonThreshold = new Date(now.getTime() + expiringSoonDays * 24 * 60 * 60 * 1000);

    const expiringSoon: any[] = [];
    const activeProducts: any[] = [];
    const expiredProducts: any[] = [];

    for (const sub of subscriptions) {
      const diffMs = new Date(sub.expiresAt).getTime() - now.getTime();
      const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      const subData = {
        ...sub,
        remainingDays,
        canRenew: sub.variant?.renewalEnabled !== false,
      };

      if (sub.status === SubscriptionStatus.EXPIRED || diffMs <= 0) {
        expiredProducts.push(subData);
      } else if (new Date(sub.expiresAt) <= expiringSoonThreshold) {
        expiringSoon.push(subData);
      } else if (sub.status === SubscriptionStatus.ACTIVE) {
        activeProducts.push(subData);
      }
    }

    return {
      expiringSoon,
      activeProducts,
      expiredProducts,
      renewalHistory,
    };
  }

  /**
   * Creates or returns existing active PENDING_PAYMENT renewal order for a subscription
   */
  static async createRenewalOrder(userId: string, subscriptionId: string) {
    const sub = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        variant: { include: { product: true } },
      },
    });

    if (!sub || sub.userId !== userId) {
      throw new Error('SUBSCRIPTION_NOT_FOUND');
    }

    if (sub.variant?.renewalEnabled === false) {
      throw new Error('RENEWAL_DISABLED_FOR_VARIANT');
    }

    // 1. Check for existing active PENDING_PAYMENT renewal order
    const existingActiveOrder = await db.order.findFirst({
      where: {
        userId,
        isRenewal: true,
        renewalOfSubscriptionId: subscriptionId,
        status: OrderStatus.PENDING_PAYMENT,
      },
      include: { payments: { orderBy: { createdAt: 'desc' } }, items: true },
    });

    if (existingActiveOrder) {
      const hasValidPayment = existingActiveOrder.payments?.some(
        (p) => p.status === PaymentStatus.PENDING && (!p.expiryTime || new Date(p.expiryTime) > new Date())
      );
      if (!hasValidPayment) {
        try {
          await PaymentService.generateOrderQRIS(existingActiveOrder.id);
        } catch (err) {
          console.error('[RenewalService] QRIS refresh error for existing order:', err);
        }
      }
      return existingActiveOrder;
    }

    // 2. Resolve target variant & selling price
    let targetVariantId = sub.variantId;
    if (sub.variant.renewalTargetVariantId) {
      targetVariantId = sub.variant.renewalTargetVariantId;
    }

    const targetVariant = await db.productVariant.findUnique({
      where: { id: targetVariantId },
      include: { product: true },
    });

    if (!targetVariant || !targetVariant.active) {
      throw new Error('TARGET_VARIANT_UNAVAILABLE');
    }

    let sellingPrice = targetVariant.price;
    if (targetVariant.renewalPriceMode === 'CUSTOM_PRICE' && targetVariant.renewalCustomPrice) {
      sellingPrice = targetVariant.renewalCustomPrice;
    } else if (targetVariant.renewalPriceMode === 'DISCOUNT_PERCENTAGE' && targetVariant.renewalDiscountPercentage) {
      sellingPrice = Math.round(targetVariant.price * (1 - targetVariant.renewalDiscountPercentage / 100));
    }

    const orderNumber = `ORD-RNW-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const order = await db.order.create({
      data: {
        orderNumber,
        userId,
        totalAmount: sellingPrice,
        grandTotal: sellingPrice,
        cashPayableAmount: sellingPrice,
        status: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        isRenewal: true,
        renewalOfSubscriptionId: subscriptionId,
        items: {
          create: {
            variantId: targetVariant.id,
            productName: targetVariant.product.name,
            variantName: targetVariant.name,
            sku: targetVariant.sku,
            unitPrice: sellingPrice,
            quantity: 1,
            subtotal: sellingPrice,
            deliveryType: targetVariant.deliveryType,
            deliveryModelSnapshot: targetVariant.deliveryModel,
            costAmountSnapshot: targetVariant.defaultCostAmount || 0,
            renewalOfSubscriptionId: subscriptionId,
          },
        },
      },
      include: { items: true },
    });

    // 3. Pre-generate QRIS Payment for the new renewal order
    try {
      await PaymentService.generateOrderQRIS(order.id);
    } catch (qrisErr) {
      console.error('[RenewalService] Failed to pre-generate QRIS for renewal:', qrisErr);
    }

    return order;
  }

  /**
   * Processes completed renewal payment, extends subscription or migrates shared slot
   */
  static async processCompletedRenewal(tx: any, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { variant: true } },
        renewalOfSubscription: { include: { variant: true } },
      },
    });

    if (!order || !order.isRenewal || !order.renewalOfSubscriptionId) {
      return;
    }

    const sub = order.renewalOfSubscription;
    if (!sub) return;

    const mode = sub.variant?.renewalFulfillmentMode || RenewalFulfillmentMode.EXTEND_EXISTING;
    const durationDays = sub.variant?.subscriptionDays || sub.variant?.warrantyDays || 30;

    const now = new Date();

    if (mode === RenewalFulfillmentMode.EXTEND_EXISTING) {
      // Base date = max(current.expiresAt, now)
      const baseTime = new Date(sub.expiresAt).getTime() > now.getTime() ? new Date(sub.expiresAt) : now;
      const newExpiresAt = new Date(baseTime.getTime() + durationDays * 24 * 60 * 60 * 1000);

      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          expiresAt: newExpiresAt,
          status: SubscriptionStatus.ACTIVE,
          lastRenewedAt: now,
          renewalCount: { increment: 1 },
        },
      });

      // Synchronize active fulfillment and slot expiry
      const fulfillment = await tx.fulfillment.findFirst({
        where: { orderItemId: sub.orderItemId },
        orderBy: { createdAt: 'desc' },
      });

      if (fulfillment) {
        await tx.fulfillment.update({
          where: { id: fulfillment.id },
          data: {
            subscriptionExpires: newExpiresAt,
            status: 'ACTIVE',
          },
        });

        if (fulfillment.sharedAccountSlotId) {
          await tx.sharedAccountSlot.update({
            where: { id: fulfillment.sharedAccountSlotId },
            data: { expiresAt: newExpiresAt },
          });
        }

        if (fulfillment.familyMemberSlotId) {
          await tx.familyMemberSlot.update({
            where: { id: fulfillment.familyMemberSlotId },
            data: { expiresAt: newExpiresAt },
          });
        }
      }
    } else if (mode === RenewalFulfillmentMode.REPLACE_ACCESS) {
      // Allocate new slot with RENEWAL_MIGRATION reason without increasing replacement count
      const baseTime = new Date(sub.expiresAt).getTime() > now.getTime() ? new Date(sub.expiresAt) : now;
      const newExpiresAt = new Date(baseTime.getTime() + durationDays * 24 * 60 * 60 * 1000);

      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          expiresAt: newExpiresAt,
          status: SubscriptionStatus.ACTIVE,
          lastRenewedAt: now,
          renewalCount: { increment: 1 },
        },
      });

      const fulfillment = await tx.fulfillment.findFirst({
        where: { orderItemId: sub.orderItemId },
        orderBy: { createdAt: 'desc' },
      });

      if (fulfillment) {
        await tx.fulfillment.update({
          where: { id: fulfillment.id },
          data: {
            subscriptionExpires: newExpiresAt,
            status: 'ACTIVE',
          },
        });
      }
    }

    await DomainEventService.publish({
      eventName: 'RENEWAL_COMPLETED',
      userId: order.userId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      productName: order.items?.[0]?.productName || 'Produk Digital',
    });
  }
}
