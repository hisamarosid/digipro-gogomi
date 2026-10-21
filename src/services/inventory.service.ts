import { db } from '@/lib/db/prisma';
import { decryptPayload, encryptPayload, formatRevealedPayload } from '@/lib/security/encryption';
import { ExpirationReason, StockStatus, DeliveryType } from '../../generated/prisma';
import { CredentialExpirationService } from './expiration/credential-expiration.service';
import { WaitlistService } from './waitlist.service';

export class InventoryService {
  /**
   * Adds new single or bulk stock items to digital inventory with AES-256-GCM encryption
   * and explicit delivery expiration calculation (FEFO ready).
   */
  static async addStock(
    variantId: string,
    rawPayloads: string[],
    deliveryType: DeliveryType = 'LICENSE_KEY',
    deliveryValidityHoursOverride?: number | null,
    customExpiresAt?: Date | null,
    costAmount?: number | null,
    supplierId?: string | null,
    supplierReference?: string | null,
    verificationConfig?: {
      verificationRequired?: boolean;
      verificationMethod?: any;
      verificationEmail?: string | null;
      verificationAccessUrl?: string | null;
      verificationMailboxId?: string | null;
      verificationProvider?: string | null;
      verificationInstructions?: string | null;
    } | null
  ) {
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
    });

    const now = new Date();
    const itemCost = costAmount != null ? costAmount : (variant?.defaultCostAmount || 0);

    const records = rawPayloads.map((payloadStr) => {
      const encrypted = encryptPayload(payloadStr.trim());

      let expiresAt: Date | null = customExpiresAt || null;
      if (!expiresAt && variant) {
        expiresAt = CredentialExpirationService.calculateExpiresAt(
          now,
          variant,
          deliveryValidityHoursOverride
        );
      }

      return {
        variantId,
        type: deliveryType,
        payloadCipher: encrypted.cipher,
        payloadIv: encrypted.iv,
        payloadAuthTag: encrypted.authTag,
        status: StockStatus.AVAILABLE,
        expiresAt,
        deliveryValidityHoursOverride: deliveryValidityHoursOverride || null,
        costAmount: itemCost,
        supplierId: supplierId || null,
        supplierReference: supplierReference || null,
        verificationRequired: Boolean(verificationConfig?.verificationRequired),
        verificationMethod: verificationConfig?.verificationMethod || 'NONE',
        verificationEmail: verificationConfig?.verificationEmail || null,
        verificationAccessUrl: verificationConfig?.verificationAccessUrl || null,
        verificationMailboxId: verificationConfig?.verificationMailboxId || null,
        verificationProvider: verificationConfig?.verificationProvider || 'GENERIC',
        verificationInstructions: verificationConfig?.verificationInstructions || null,
        createdAt: now,
      };
    });

    const result = await db.inventoryItem.createMany({
      data: records,
    });

    // Detect restock event for waitlisted customers
    await WaitlistService.detectRestockAndNotify(variantId);

    return result;
  }

  /**
   * FEFO (First Expired, First Out) Concurrency-safe atomic allocation of an available stock item.
   * Skips and lazy-expires any stale/expired items without penalizing paid customer orders.
   */
  static async allocateStockTx(
    tx: any,
    variantId: string,
    orderItemId: string
  ): Promise<{ success: boolean; item?: any; reason?: string }> {
    const now = new Date();

    // 1. Query candidate available stock items sorted by FEFO (nearest deadline first)
    const candidates = await tx.inventoryItem.findMany({
      where: {
        variantId,
        status: StockStatus.AVAILABLE,
      },
      orderBy: [
        { expiresAt: 'asc' },
        { createdAt: 'asc' },
      ],
      take: 10, // Fetch top candidates to inspect
    });

    if (!candidates || candidates.length === 0) {
      return { success: false, reason: 'OUT_OF_STOCK' };
    }

    // 2. Iterate candidates, lazy-expiring stale items and selecting the first valid FEFO candidate
    for (const candidate of candidates) {
      if (candidate.expiresAt && now.getTime() >= new Date(candidate.expiresAt).getTime()) {
        // Lazy expiration: candidate expired before assignment!
        await tx.inventoryItem.update({
          where: { id: candidate.id },
          data: {
            status: (StockStatus as any).EXPIRED || 'EXPIRED',
            expiredAt: now,
            expirationReason: ExpirationReason.DELIVERY_DEADLINE_REACHED,
          },
        });
        continue; // Skip expired candidate, try next candidate
      }

      // Candidate is valid & not expired! Perform atomic state allocation check
      const updatedCount = await tx.inventoryItem.updateMany({
        where: {
          id: candidate.id,
          status: StockStatus.AVAILABLE,
        },
        data: {
          status: StockStatus.ASSIGNED,
          assignedOrderItemId: orderItemId,
          assignedAt: now,
        },
      });

      if (updatedCount.count === 0) {
        // Race condition; candidate was snatched concurrently. Continue to next
        continue;
      }

      // Check remaining available stock count for low stock alert
      const remainingStock = await tx.inventoryItem.count({
        where: { variantId, status: StockStatus.AVAILABLE },
      });

      if (remainingStock <= 2) {
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          include: { product: { select: { name: true } } },
        });

        if (variant) {
          const { TelegramService } = await import('./telegram.service');
          TelegramService.sendInventoryAlertNotification({
            variantId,
            productName: variant.product?.name || 'Produk Digital',
            variantName: variant.name,
            remainingStock,
            minThreshold: 2,
          }).catch(() => {});
        }
      }

      // Successfully allocated!
      const allocatedItem = await tx.inventoryItem.findUnique({
        where: { id: candidate.id },
      });

      return { success: true, item: allocatedItem };
    }

    // If all top candidates were expired or snatched
    return { success: false, reason: 'OUT_OF_STOCK' };
  }

  /**
   * Decrypts an assigned inventory item payload for server-side delivery to authorized customer
   */
  static getPlainPayload(item: { payloadCipher: string; payloadIv: string; payloadAuthTag: string }): string {
    const raw = decryptPayload({
      cipher: item.payloadCipher,
      iv: item.payloadIv,
      authTag: item.payloadAuthTag,
    });
    return formatRevealedPayload(raw);
  }
}
