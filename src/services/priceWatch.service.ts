import { db } from '@/lib/db/prisma';
import { PriceWatchStatus } from '../../generated/prisma';
import { NotificationService } from './notification.service';
import { CustomerNotificationCategory } from '../../generated/prisma';

export class PriceWatchService {
  /**
   * Create or activate a price watch for a product variant
   */
  static async createPriceWatch(
    userId: string,
    productId: string,
    productVariantId: string,
    targetPrice?: number | null
  ) {
    const variant = await db.productVariant.findUnique({
      where: { id: productVariantId },
      include: { product: true },
    });

    if (!variant || variant.productId !== productId) {
      throw new Error('Varian produk tidak ditemukan');
    }

    const referencePrice = variant.price;

    const existing = await db.priceWatch.findFirst({
      where: {
        userId,
        productVariantId,
        status: { in: [PriceWatchStatus.ACTIVE, PriceWatchStatus.PAUSED] },
      },
    });

    if (existing) {
      return db.priceWatch.update({
        where: { id: existing.id },
        data: {
          status: PriceWatchStatus.ACTIVE,
          referencePrice,
          targetPrice: targetPrice || null,
        },
      });
    }

    return db.priceWatch.create({
      data: {
        userId,
        productId,
        productVariantId,
        referencePrice,
        targetPrice: targetPrice || null,
        status: PriceWatchStatus.ACTIVE,
      },
    });
  }

  /**
   * Cancel an active price watch
   */
  static async cancelPriceWatch(userId: string, priceWatchId: string) {
    const watch = await db.priceWatch.findUnique({
      where: { id: priceWatchId },
    });

    if (!watch || watch.userId !== userId) {
      throw new Error('Price alert tidak ditemukan');
    }

    return db.priceWatch.update({
      where: { id: priceWatchId },
      data: { status: PriceWatchStatus.CANCELLED },
    });
  }

  /**
   * Get user's active price watches
   */
  static async getUserPriceWatches(userId: string) {
    const watches = await db.priceWatch.findMany({
      where: {
        userId,
        status: { in: [PriceWatchStatus.ACTIVE, PriceWatchStatus.PAUSED] },
      },
      include: {
        product: true,
        variant: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return watches.map((w) => ({
      id: w.id,
      productId: w.productId,
      productVariantId: w.productVariantId,
      productName: w.product.name,
      variantName: w.variant.name,
      thumbnail: w.product.thumbnail,
      referencePrice: w.referencePrice,
      currentPrice: w.variant.price,
      targetPrice: w.targetPrice,
      status: w.status,
      lastNotifiedPrice: w.lastNotifiedPrice,
      lastNotifiedAt: w.lastNotifiedAt,
      createdAt: w.createdAt,
    }));
  }

  /**
   * Trigger price drop notifications when admin updates variant price
   */
  static async detectPriceDropsAndNotify(
    variantId: string,
    oldPrice: number,
    newPrice: number,
    minDropPercentage = 5
  ) {
    // Only process if price actually dropped
    if (newPrice >= oldPrice) return { count: 0 };

    const dropAmount = oldPrice - newPrice;
    const dropPercentage = (dropAmount / oldPrice) * 100;

    if (dropPercentage < minDropPercentage) {
      return { count: 0, reason: 'BELOW_MIN_PERCENTAGE' };
    }

    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant) return { count: 0 };

    // Fetch active watchers
    const activeWatches = await db.priceWatch.findMany({
      where: {
        productVariantId: variantId,
        status: PriceWatchStatus.ACTIVE,
      },
    });

    let notifiedCount = 0;
    const now = new Date();

    for (const watch of activeWatches) {
      // If targetPrice is set, verify newPrice <= targetPrice
      if (watch.targetPrice && newPrice > watch.targetPrice) {
        continue;
      }

      // Avoid duplicate notification for same price level
      if (watch.lastNotifiedPrice === newPrice) {
        continue;
      }

      // Dispatch in-app notification to customer
      await NotificationService.sendCustomerNotification({
        userId: watch.userId,
        type: 'PRODUCT_PRICE_DROPPED',
        category: CustomerNotificationCategory.PROMOTION,
        title: `📉 Harga ${variant.product.name} Turun!`,
        message: `Kabar gembira! ${variant.product.name} (${variant.name}) sekarang berharga Rp${newPrice.toLocaleString('id-ID')} (turun Rp${dropAmount.toLocaleString('id-ID')}).`,
        actionUrl: `/products/${variant.product.slug}`,
      });

      // Update watch record state
      await db.priceWatch.update({
        where: { id: watch.id },
        data: {
          status: PriceWatchStatus.TRIGGERED,
          lastNotifiedPrice: newPrice,
          lastNotifiedAt: now,
        },
      });

      notifiedCount++;
    }

    return { count: notifiedCount, dropPercentage };
  }

  /**
   * Auto-pause price watch when customer completes a purchase for that variant
   */
  static async pauseWatchOnPurchase(userId: string, variantId: string) {
    if (!userId || !variantId) return;

    await db.priceWatch.updateMany({
      where: {
        userId,
        productVariantId: variantId,
        status: PriceWatchStatus.ACTIVE,
      },
      data: {
        status: PriceWatchStatus.PAUSED,
      },
    });
  }
}
