import { db } from '@/lib/db/prisma';
import { generateSecureToken } from '@/lib/utils/formatters';
import { InventoryService } from './inventory.service';
import { LoyaltyService } from './loyalty.service';
import { SharedAccountService } from './sharedAccount.service';
import { FamilyGroupService } from './familyGroup.service';
import { CostEngineService } from './costEngine.service';
import { DomainEventService } from './domainEvent.service';
import { TelegramService } from './telegram.service';
import { RenewalService } from './renewal.service';
import { ReferralService } from './referral.service';
import { WaitlistService } from './waitlist.service';
import {
  DeliveryType,
  DeliveryModel,
  FulfillmentStatus,
  OrderStatus,
  SubscriptionStatus,
} from '../../generated/prisma';

// Strategy Imports
import { SharedAccountFulfillmentStrategy } from './fulfillment/sharedAccountFulfillment';
import { FamilyMemberFulfillmentStrategy } from './fulfillment/familyMemberFulfillment';
import { DedicatedAccountFulfillmentStrategy } from './fulfillment/dedicatedFulfillment';
import { LicenseKeyFulfillmentStrategy } from './fulfillment/licenseKeyFulfillment';
import { DownloadFulfillmentStrategy } from './fulfillment/downloadFulfillment';
import { ManualFulfillmentStrategy } from './fulfillment/manualFulfillment';

export class FulfillmentService {
  /**
   * Strategy Map Registry
   */
  private static strategies = {
    [DeliveryModel.SHARED_ACCOUNT]: new SharedAccountFulfillmentStrategy(),
    [DeliveryModel.FAMILY_MEMBER]: new FamilyMemberFulfillmentStrategy(),
    [DeliveryModel.DEDICATED_ACCOUNT]: new DedicatedAccountFulfillmentStrategy(),
    [DeliveryModel.LICENSE_KEY]: new LicenseKeyFulfillmentStrategy(),
    [DeliveryModel.DOWNLOAD]: new DownloadFulfillmentStrategy(),
    [DeliveryModel.MANUAL]: new ManualFulfillmentStrategy(),
  };

  /**
   * Main fulfillment orchestration function called after payment is verified (PAID)
   */
  static async fulfillOrder(orderId: string): Promise<{ success: boolean; outOfStockItems: string[] }> {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { variant: true },
        },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const outOfStockItems: string[] = [];

    // Fulfill each order item inside database transaction (15s timeout)
    await db.$transaction(async (tx) => {
      for (const item of order.items) {
        // Skip if already fulfilled or active with a valid assigned asset
        const existingFulfillment = await tx.fulfillment.findFirst({
          where: {
            orderItemId: item.id,
            status: { in: [FulfillmentStatus.FULFILLED, FulfillmentStatus.ACTIVE] },
          },
          include: {
            inventoryItem: true,
            sharedAccountSlot: true,
            familyMemberSlot: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        let hasValidAsset = false;
        if (existingFulfillment) {
          if (existingFulfillment.inventoryItem && existingFulfillment.inventoryItem.status === 'ASSIGNED') {
            hasValidAsset = true;
          } else if (existingFulfillment.sharedAccountSlot && existingFulfillment.sharedAccountSlot.status === 'ASSIGNED') {
            hasValidAsset = true;
          } else if (existingFulfillment.familyMemberSlot && existingFulfillment.familyMemberSlot.status === 'ASSIGNED') {
            hasValidAsset = true;
          } else if (
            existingFulfillment.payloadRevealed &&
            !existingFulfillment.inventoryItemId &&
            !existingFulfillment.sharedAccountSlotId &&
            !existingFulfillment.familyMemberSlotId
          ) {
            hasValidAsset = true;
          }
        }

        if (hasValidAsset) {
          continue;
        }

        const deliveryModel =
          (item.deliveryModelSnapshot as DeliveryModel) ||
          (item.variant?.deliveryModel as DeliveryModel) ||
          DeliveryModel.DEDICATED_ACCOUNT;
        const strategy = this.strategies[deliveryModel];

        if (strategy) {
          const res = await strategy.execute(tx, {
            orderItemId: item.id,
            variantId: item.variantId,
            userId: order.userId || undefined,
            invitationEmail: item.invitationEmail || undefined,
          });

          if (!res.success) {
            outOfStockItems.push(`${item.productName} (${item.variantName})`);
          } else {
            // Resolve & snapshot item COGS
            const cogs = await CostEngineService.resolveItemCOGS(tx, item.id, deliveryModel);
            await tx.orderItem.update({
              where: { id: item.id },
              data: {
                costAmountSnapshot: cogs.costAmount,
                isCostUnknown: cogs.isCostUnknown,
                supplierId: cogs.supplierId,
              },
            });

            if (order.userId && res.fulfillment) {
              // Automatically create customer subscription record
              const days = item.variant?.subscriptionDays || item.variant?.warrantyDays || 30;
              const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
              const existingSub = await tx.subscription.findFirst({
                where: { orderItemId: item.id, userId: order.userId },
              });
              if (!existingSub) {
                await tx.subscription.create({
                  data: {
                    userId: order.userId,
                    orderItemId: item.id,
                    variantId: item.variantId,
                    status: SubscriptionStatus.ACTIVE,
                    expiresAt,
                  },
                });
              }
            }

            // Publish PRODUCT_DELIVERED event
            await DomainEventService.publish({
              eventName: 'PRODUCT_DELIVERED',
              userId: order.userId,
              orderId,
              orderNumber: order.orderNumber,
              orderItemId: item.id,
              productName: item.productName,
            });
          }
        }
      }

      // Update final overall Order Status & Award Purchase Reward
      if (outOfStockItems.length > 0) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.NEEDS_FULFILLMENT },
        });

        // Trigger Telegram Waiting Stock Alert for Admin
        TelegramService.sendFulfillmentWaitingStockNotification({
          orderId,
          orderNumber: order.orderNumber,
          productName: outOfStockItems.join(', '),
          issue: `Stok tidak tersedia untuk item: ${outOfStockItems.join(', ')}`,
        }).catch(() => {});
      } else {
        const hasManual = order.items.some(
          (i) => i.variant?.deliveryModel === DeliveryModel.MANUAL || i.deliveryType === DeliveryType.MANUAL
        );
        const finalStatus = hasManual ? OrderStatus.PROCESSING : OrderStatus.COMPLETED;

        await tx.order.update({
          where: { id: orderId },
          data: { status: finalStatus },
        });

        if (finalStatus === OrderStatus.COMPLETED) {
          await LoyaltyService.awardPurchaseRewardTx(tx, orderId);
          await RenewalService.processCompletedRenewal(tx, orderId);
          await ReferralService.evaluateQualifyingOrder(tx, orderId);

          for (const item of order.items) {
            await WaitlistService.markWaitlistConverted(item.variantId, order.userId, order.guestEmail || '', orderId);
          }
        }
      }

      // Generate Order Financial Snapshot
      await CostEngineService.generateOrderFinancialSnapshot(tx, orderId);
    }, { timeout: 20000 });

    return {
      success: outOfStockItems.length === 0,
      outOfStockItems,
    };
  }
}
