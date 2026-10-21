import { db } from '@/lib/db/prisma';
import { WaitlistStatus } from '../../generated/prisma';
import { DomainEventService } from './domainEvent.service';

export class WaitlistService {
  /**
   * Calculates eligible sellable stock for a variant
   */
  static async getEligibleStockCount(variantId: string): Promise<number> {
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant || !variant.active) return 0;

    const now = new Date();

    if (variant.deliveryModel === 'DEDICATED_ACCOUNT' || variant.deliveryModel === 'LICENSE_KEY') {
      return await db.inventoryItem.count({
        where: {
          variantId,
          status: 'AVAILABLE',
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      });
    }

    if (variant.deliveryModel === 'SHARED_ACCOUNT') {
      const slots = await db.sharedAccountSlot.count({
        where: {
          status: 'AVAILABLE',
          sharedAccount: {
            productVariantId: variantId,
            status: { in: ['AVAILABLE', 'PARTIALLY_USED'] },
            OR: [{ masterExpiresAt: null }, { masterExpiresAt: { gt: now } }],
          },
        },
      });
      return slots;
    }

    if (variant.deliveryModel === 'FAMILY_MEMBER') {
      const slots = await db.familyMemberSlot.count({
        where: {
          status: 'AVAILABLE',
          familyGroup: {
            productVariantId: variantId,
            status: { in: ['AVAILABLE', 'PARTIALLY_USED'] },
          },
        },
      });
      return slots;
    }

    return 0;
  }

  /**
   * Joins waitlist idempotently
   */
  static async joinWaitlist(userId: string | null, email: string, variantId: string) {
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant || !variant.active) {
      throw new Error('VARIANT_UNAVAILABLE');
    }

    const currentStock = await this.getEligibleStockCount(variantId);
    if (currentStock > 0) {
      throw new Error('STOCK_IS_AVAILABLE');
    }

    // Check existing active entry
    const existing = await db.productWaitlist.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        productVariantId: variantId,
        status: WaitlistStatus.ACTIVE,
      },
    });

    if (existing) {
      return existing;
    }

    const entry = await db.productWaitlist.create({
      data: {
        userId,
        email: email.trim().toLowerCase(),
        productId: variant.productId,
        productVariantId: variantId,
        status: WaitlistStatus.ACTIVE,
      },
    });

    return entry;
  }

  /**
   * Detects restock and notifies waitlisted customers using multiplier strategy
   */
  static async detectRestockAndNotify(variantId: string) {
    try {
      const eligibleStock = await this.getEligibleStockCount(variantId);
      if (eligibleStock <= 0) return;

      const variant = await db.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
      });

      if (!variant || variant.waitlistEnabled === false) return;

      const cooldownHours = variant.waitlistNotificationCooldownHours || 24;
      const cooldownThreshold = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);

      // Multiplier strategy: notify up to 2x available stock
      const notifyLimit = Math.max(5, eligibleStock * 2);

      const activeWaitlist = await db.productWaitlist.findMany({
        where: {
          productVariantId: variantId,
          status: WaitlistStatus.ACTIVE,
          OR: [{ notifiedAt: null }, { notifiedAt: { lt: cooldownThreshold } }],
        },
        orderBy: { createdAt: 'asc' },
        take: notifyLimit,
      });

      if (activeWaitlist.length === 0) return;

      const now = new Date();

      for (const w of activeWaitlist) {
        await db.productWaitlist.update({
          where: { id: w.id },
          data: {
            status: WaitlistStatus.NOTIFIED,
            notifiedAt: now,
          },
        });

        if (w.userId) {
          await DomainEventService.publish({
            eventName: 'VARIANT_RESTOCKED',
            userId: w.userId,
            productName: `${variant.product.name} (${variant.name})`,
            metadata: {
              productSlug: variant.product.slug,
              variantId: variant.id,
            },
          });
        }
      }
    } catch (error) {
      console.error('[WaitlistService detectRestockAndNotify Error]:', error);
    }
  }

  /**
   * Marks waitlist entry converted upon order completion
   */
  static async markWaitlistConverted(variantId: string, userId: string | null, email: string, orderId: string) {
    try {
      const where: any = {
        productVariantId: variantId,
        status: { in: [WaitlistStatus.ACTIVE, WaitlistStatus.NOTIFIED] },
      };

      if (userId) {
        where.userId = userId;
      } else {
        where.email = email.trim().toLowerCase();
      }

      await db.productWaitlist.updateMany({
        where,
        data: {
          status: WaitlistStatus.CONVERTED,
          convertedAt: new Date(),
          convertedOrderId: orderId,
        },
      });
    } catch (error) {
      console.error('[WaitlistService markWaitlistConverted Error]:', error);
    }
  }
}
