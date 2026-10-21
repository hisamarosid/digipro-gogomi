import { db } from '@/lib/db/prisma';
import { ReplacementMode, ReplacementStatus, StockStatus, SubscriptionStatus } from '../../../generated/prisma';
import { CredentialExpirationService } from '../expiration/credential-expiration.service';

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  nextEligibleAt?: Date;
  lastReplacementAt?: Date | null;
  completedCount: number;
  maxReplacement?: number | null;
  validUntil?: Date | null;
  availableStockCount: number;
  allowQueue: boolean;
  mode: ReplacementMode;
  requiresReason: boolean;
  activeFulfillment?: any;
  orderItem?: any;
}

export class ReplacementEligibilityService {
  /**
   * Evaluates server-side replacement eligibility for an order item
   */
  static async checkReplacementEligibility(
    orderItemId: string,
    userId: string
  ): Promise<EligibilityResult> {
    const orderItem = await db.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
        variant: true,
        fulfillments: {
          orderBy: { createdAt: 'desc' },
          include: { inventoryItem: true },
        },
        subscriptions: {
          where: { status: SubscriptionStatus.ACTIVE },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!orderItem) {
      return {
        eligible: false,
        reason: 'ORDER_NOT_FOUND',
        completedCount: 0,
        availableStockCount: 0,
        allowQueue: false,
        mode: ReplacementMode.DISABLED,
        requiresReason: false,
      };
    }

    const { order, variant, fulfillments, subscriptions } = orderItem;

    // 1. Authorization check: Order ownership (supports both userId and matched guestEmail)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    const isOwnedByUser = order.userId === userId;
    const isOwnedByGuestEmail =
      !!order.guestEmail &&
      !!user?.email &&
      order.guestEmail.toLowerCase() === user.email.toLowerCase();

    if (!isOwnedByUser && !isOwnedByGuestEmail) {
      return {
        eligible: false,
        reason: 'UNAUTHORIZED',
        completedCount: 0,
        availableStockCount: 0,
        allowQueue: false,
        mode: ReplacementMode.DISABLED,
        requiresReason: false,
      };
    }

    if (!order.userId && isOwnedByGuestEmail) {
      await db.order.update({
        where: { id: order.id },
        data: { userId },
      }).catch(() => {});
    }

    // 2. Order Payment Check
    if (order.paymentStatus !== 'PAID' && order.status !== 'PAID' && order.status !== 'COMPLETED') {
      return {
        eligible: false,
        reason: 'ORDER_NOT_PAID',
        completedCount: 0,
        availableStockCount: 0,
        allowQueue: false,
        mode: ReplacementMode.DISABLED,
        requiresReason: false,
      };
    }

    // 3. Variant Policy Check
    if (!variant || !variant.replacementEnabled || variant.replacementMode === ReplacementMode.DISABLED) {
      const days = variant?.subscriptionDays || variant?.warrantyDays || 30;
      const validUntil = new Date(order.createdAt.getTime() + days * 24 * 3600 * 1000);
      return {
        eligible: false,
        reason: 'REPLACEMENT_DISABLED',
        validUntil,
        completedCount: 0,
        availableStockCount: 0,
        allowQueue: false,
        mode: ReplacementMode.DISABLED,
        requiresReason: false,
      };
    }

    // 4. Find active fulfillment
    const activeFulfillment = fulfillments.find(
      (f) => f.status === 'ACTIVE' || f.status === 'FULFILLED'
    ) || fulfillments[0];

    if (!activeFulfillment) {
      return {
        eligible: false,
        reason: 'NO_ACTIVE_FULFILLMENT',
        completedCount: 0,
        availableStockCount: 0,
        allowQueue: variant.replacementAllowWhenOutOfStockQueue,
        mode: variant.replacementMode,
        requiresReason: variant.replacementRequiresReason,
      };
    }

    // 5. Validity Period Check
    let validUntil: Date | null = null;
    const now = new Date();

    if (variant.replacementValidityType === 'SUBSCRIPTION') {
      const activeSub = subscriptions[0];
      if (activeSub && activeSub.expiresAt) {
        validUntil = activeSub.expiresAt;
      } else if (activeFulfillment.subscriptionExpires) {
        validUntil = activeFulfillment.subscriptionExpires;
      } else {
        const days = variant.subscriptionDays || variant.warrantyDays || 30;
        validUntil = new Date(order.createdAt.getTime() + days * 24 * 3600 * 1000);
      }

      if (!validUntil || validUntil.getTime() <= now.getTime()) {
        return {
          eligible: false,
          reason: 'SUBSCRIPTION_EXPIRED',
          validUntil,
          completedCount: 0,
          availableStockCount: 0,
          allowQueue: variant.replacementAllowWhenOutOfStockQueue,
          mode: variant.replacementMode,
          requiresReason: variant.replacementRequiresReason,
          activeFulfillment,
          orderItem,
        };
      }
    } else if (variant.replacementValidityType === 'WARRANTY') {
      const warrantyDays = variant.warrantyDays || 30;
      validUntil = new Date(order.createdAt.getTime() + warrantyDays * 24 * 3600 * 1000);
      if (now.getTime() > validUntil.getTime()) {
        return {
          eligible: false,
          reason: 'WARRANTY_EXPIRED',
          validUntil,
          completedCount: 0,
          availableStockCount: 0,
          allowQueue: variant.replacementAllowWhenOutOfStockQueue,
          mode: variant.replacementMode,
          requiresReason: variant.replacementRequiresReason,
          activeFulfillment,
          orderItem,
        };
      }
    } else if (variant.replacementValidityType === 'CUSTOM_DAYS') {
      const days = variant.replacementValidityDays || 30;
      validUntil = new Date(order.createdAt.getTime() + days * 24 * 3600 * 1000);
      if (now.getTime() > validUntil.getTime()) {
        return {
          eligible: false,
          reason: 'REPLACEMENT_VALIDITY_EXPIRED',
          validUntil,
          completedCount: 0,
          availableStockCount: 0,
          allowQueue: variant.replacementAllowWhenOutOfStockQueue,
          mode: variant.replacementMode,
          requiresReason: variant.replacementRequiresReason,
          activeFulfillment,
          orderItem,
        };
      }
    }

    // 6. Replacement History & Cooldown Rule Calculation
    const replacementRequests = await db.replacementRequest.findMany({
      where: { orderItemId: orderItemId },
      orderBy: { createdAt: 'desc' },
    });

    // Check for unresolved processing/pending/waiting requests
    const activeProcessingRequest = replacementRequests.find(
      (r) =>
        r.status === ReplacementStatus.PENDING ||
        r.status === ReplacementStatus.PROCESSING ||
        r.status === ReplacementStatus.WAITING_STOCK
    );

    if (activeProcessingRequest) {
      const statusReason =
        activeProcessingRequest.status === ReplacementStatus.WAITING_STOCK
          ? 'WAITING_FOR_STOCK'
          : 'REQUEST_ALREADY_PROCESSING';
      return {
        eligible: false,
        reason: statusReason,
        validUntil,
        completedCount: replacementRequests.filter((r) => r.status === ReplacementStatus.COMPLETED).length,
        maxReplacement: variant.replacementMaxCount,
        availableStockCount: 0,
        allowQueue: variant.replacementAllowWhenOutOfStockQueue,
        mode: variant.replacementMode,
        requiresReason: variant.replacementRequiresReason,
        activeFulfillment,
        orderItem,
      };
    }

    const completedReplacements = replacementRequests.filter(
      (r) => r.status === ReplacementStatus.COMPLETED
    );
    const completedCount = completedReplacements.length;

    // Check maximum replacement limit
    if (variant.replacementMaxCount != null && completedCount >= variant.replacementMaxCount) {
      return {
        eligible: false,
        reason: 'MAX_REPLACEMENT_REACHED',
        validUntil,
        completedCount,
        maxReplacement: variant.replacementMaxCount,
        availableStockCount: 0,
        allowQueue: variant.replacementAllowWhenOutOfStockQueue,
        mode: variant.replacementMode,
        requiresReason: variant.replacementRequiresReason,
        activeFulfillment,
        orderItem,
      };
    }

    // Cooldown rule calculation
    const lastReplacement = completedReplacements[0];
    const lastReplacementAt = lastReplacement ? lastReplacement.processedAt || lastReplacement.createdAt : null;
    const baseTimestamp = lastReplacementAt || activeFulfillment.deliveredAt || order.createdAt;

    const cooldownHours = variant.replacementCooldownHours || 72;
    const nextEligibleAt = new Date(baseTimestamp.getTime() + cooldownHours * 3600 * 1000);

    if (now.getTime() < nextEligibleAt.getTime()) {
      return {
        eligible: false,
        reason: 'COOLDOWN_ACTIVE',
        nextEligibleAt,
        lastReplacementAt,
        completedCount,
        maxReplacement: variant.replacementMaxCount,
        validUntil,
        availableStockCount: 0,
        allowQueue: variant.replacementAllowWhenOutOfStockQueue,
        mode: variant.replacementMode,
        requiresReason: variant.replacementRequiresReason,
        activeFulfillment,
        orderItem,
      };
    }

    // 7. Check Available Valid Inventory Stock (Excludes EXPIRED items)
    const availableStockCount = await CredentialExpirationService.getValidStockCount(variant.id);

    if (availableStockCount === 0) {
      if (variant.replacementAllowWhenOutOfStockQueue) {
        return {
          eligible: true,
          reason: 'WAITING_STOCK_ALLOWED',
          nextEligibleAt,
          lastReplacementAt,
          completedCount,
          maxReplacement: variant.replacementMaxCount,
          validUntil,
          availableStockCount: 0,
          allowQueue: true,
          mode: variant.replacementMode,
          requiresReason: variant.replacementRequiresReason,
          activeFulfillment,
          orderItem,
        };
      } else {
        return {
          eligible: false,
          reason: 'OUT_OF_STOCK',
          nextEligibleAt,
          lastReplacementAt,
          completedCount,
          maxReplacement: variant.replacementMaxCount,
          validUntil,
          availableStockCount: 0,
          allowQueue: false,
          mode: variant.replacementMode,
          requiresReason: variant.replacementRequiresReason,
          activeFulfillment,
          orderItem,
        };
      }
    }

    return {
      eligible: true,
      nextEligibleAt,
      lastReplacementAt,
      completedCount,
      maxReplacement: variant.replacementMaxCount,
      validUntil,
      availableStockCount,
      allowQueue: variant.replacementAllowWhenOutOfStockQueue,
      mode: variant.replacementMode,
      requiresReason: variant.replacementRequiresReason,
      activeFulfillment,
      orderItem,
    };
  }
}
