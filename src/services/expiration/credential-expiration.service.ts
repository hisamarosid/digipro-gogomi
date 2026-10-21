import { db } from '@/lib/db/prisma';
import { ExpirationReason, StockStatus, ProductVariant } from '../../../generated/prisma';

export interface ExpirationMetrics {
  totalAdded: number;
  totalAssigned: number;
  totalExpired: number;
  expirationRate: number; // percentage
  expiring24hCount: number;
  critical6hCount: number;
  validAvailableCount: number;
}

export class CredentialExpirationService {
  /**
   * Calculates explicit expiresAt date for an inventory item upon creation based on
   * custom override or variant default policy.
   */
  static calculateExpiresAt(
    createdAt: Date,
    variant: Partial<ProductVariant>,
    deliveryValidityHoursOverride?: number | null
  ): Date | null {
    if (deliveryValidityHoursOverride != null && deliveryValidityHoursOverride > 0) {
      return new Date(createdAt.getTime() + deliveryValidityHoursOverride * 3600 * 1000);
    }

    if (variant.credentialExpirationEnabled && variant.credentialDeliveryValidityHours) {
      return new Date(createdAt.getTime() + variant.credentialDeliveryValidityHours * 3600 * 1000);
    }

    return null;
  }

  /**
   * Scans and expires all available inventory items that have reached their delivery deadline (now >= expiresAt).
   * Safe for lazy expiration checks and scheduled cron runs.
   */
  static async expireStaleCredentials(variantId?: string): Promise<number> {
    const now = new Date();

    const staleItems = await db.inventoryItem.findMany({
      where: {
        status: StockStatus.AVAILABLE,
        expiresAt: { lte: now },
        ...(variantId ? { variantId } : {}),
      },
      select: { id: true, variantId: true },
    });

    if (staleItems.length === 0) {
      return 0;
    }

    const itemIds = staleItems.map((item) => item.id);

    const result = await db.inventoryItem.updateMany({
      where: {
        id: { in: itemIds },
        status: StockStatus.AVAILABLE,
      },
      data: {
        status: (StockStatus as any).EXPIRED || 'EXPIRED',
        expiredAt: now,
        expirationReason: ExpirationReason.DELIVERY_DEADLINE_REACHED,
      },
    });

    return result.count;
  }

  /**
   * Returns valid available inventory count for a variant (excludes EXPIRED items).
   */
  static async getValidStockCount(variantId: string): Promise<number> {
    const now = new Date();
    // Run lazy cleanup first
    await this.expireStaleCredentials(variantId);

    return await db.inventoryItem.count({
      where: {
        variantId,
        status: StockStatus.AVAILABLE,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
    });
  }

  /**
   * Generates comprehensive inventory expiration report & waste analytics.
   */
  static async getExpirationMetrics(variantId?: string): Promise<ExpirationMetrics> {
    const now = new Date();
    const whereVariant = variantId ? { variantId } : {};

    // Lazy cleanup
    await this.expireStaleCredentials(variantId);

    const [totalAdded, totalAssigned, totalExpired, validAvailableCount, expiring24hCount, critical6hCount] =
      await Promise.all([
        db.inventoryItem.count({ where: whereVariant }),
        db.inventoryItem.count({
          where: {
            ...whereVariant,
            status: { in: [StockStatus.ASSIGNED, StockStatus.SOLD] },
          },
        }),
        db.inventoryItem.count({
          where: {
            ...whereVariant,
            status: (StockStatus as any).EXPIRED || 'EXPIRED',
          },
        }),
        db.inventoryItem.count({
          where: {
            ...whereVariant,
            status: StockStatus.AVAILABLE,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        }),
        db.inventoryItem.count({
          where: {
            ...whereVariant,
            status: StockStatus.AVAILABLE,
            expiresAt: {
              gt: now,
              lte: new Date(now.getTime() + 24 * 3600 * 1000),
            },
          },
        }),
        db.inventoryItem.count({
          where: {
            ...whereVariant,
            status: StockStatus.AVAILABLE,
            expiresAt: {
              gt: now,
              lte: new Date(now.getTime() + 6 * 3600 * 1000),
            },
          },
        }),
      ]);

    const expirationRate = totalAdded > 0 ? Math.round((totalExpired / totalAdded) * 100) : 0;

    return {
      totalAdded,
      totalAssigned,
      totalExpired,
      expirationRate,
      expiring24hCount,
      critical6hCount,
      validAvailableCount,
    };
  }
}
