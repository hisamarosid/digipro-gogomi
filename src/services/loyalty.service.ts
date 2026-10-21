import { db } from '@/lib/db/prisma';
import { cache } from 'react';
import {
  CoinGrantStatus,
  CoinReservationStatus,
  CoinLedgerType,
  CoinEarningMode,
  CoinRedemptionMode,
} from '../../generated/prisma';
import { AuditService } from '@/services/audit.service';

export interface LoyaltySettingsConfig {
  id: string;
  enabled: boolean;
  coinName: string;
  currencyValuePerCoin: number; // 1 Coin = Rp10
  defaultRewardPercentage: number; // 2.0%
  pendingPeriodDays: number;
  expirationDays: number;
  minimumRedemptionCoins: number;
  maximumRedemptionPercentage: number;
  allowCouponWithCoins: boolean;
  allowFullCoinPaymentGlobally: boolean;
  notifyBeforeExpirationDays: number;
  coinEarningEnabled: boolean;
  coinRedemptionEnabled: boolean;
  returnedCoinMinimumValidityDays: number;
}

export class LoyaltyService {
  /**
   * Cached helper for default settings lookup in request scope
   */
  private static getCachedSettingsInternal = cache(async (): Promise<LoyaltySettingsConfig> => {
    let settings = await db.coinSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await db.coinSettings.create({
        data: {
          id: 'default',
          enabled: true,
          coinName: 'Store Coin',
          currencyValuePerCoin: 10,
          defaultRewardPercentage: 2.0,
          pendingPeriodDays: 7,
          expirationDays: 365,
          minimumRedemptionCoins: 10,
          maximumRedemptionPercentage: 100,
          allowCouponWithCoins: true,
          allowFullCoinPaymentGlobally: true,
          notifyBeforeExpirationDays: 7,
          coinEarningEnabled: true,
          coinRedemptionEnabled: true,
          returnedCoinMinimumValidityDays: 30,
        },
      });
    }

    return settings as LoyaltySettingsConfig;
  });

  /**
   * Fetch global Loyalty Coin settings or initialize default row if empty.
   */
  static async getSettings(prismaTx?: any): Promise<LoyaltySettingsConfig> {
    if (prismaTx) {
      const client = prismaTx;
      let settings = await client.coinSettings.findUnique({
        where: { id: 'default' },
      });
      if (!settings) {
        settings = await client.coinSettings.create({
          data: {
            id: 'default',
            enabled: true,
            coinName: 'Store Coin',
            currencyValuePerCoin: 10,
            defaultRewardPercentage: 2.0,
            pendingPeriodDays: 7,
            expirationDays: 365,
            minimumRedemptionCoins: 10,
            maximumRedemptionPercentage: 100,
            allowCouponWithCoins: true,
            allowFullCoinPaymentGlobally: true,
            notifyBeforeExpirationDays: 7,
            coinEarningEnabled: true,
            coinRedemptionEnabled: true,
            returnedCoinMinimumValidityDays: 30,
          },
        });
      }
      return settings as LoyaltySettingsConfig;
    }

    return await LoyaltyService.getCachedSettingsInternal();
  }

  /**
   * Update global Loyalty Coin settings.
   */
  static async updateSettings(data: Partial<LoyaltySettingsConfig>, actorId?: string): Promise<LoyaltySettingsConfig> {
    const current = await this.getSettings();
    const updated = await db.coinSettings.update({
      where: { id: 'default' },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    if (actorId) {
      await AuditService.log({
        actorId,
        action: 'UPDATE_LOYALTY_SETTINGS',
        entity: 'CoinSettings',
        entityId: 'default',
        before: current,
        after: updated,
      });
    }

    return updated as LoyaltySettingsConfig;
  }

  /**
   * Currency Conversion Helpers
   * 1 Coin = Rp10 (100 Coins = Rp1.000)
   */
  static coinsToCurrency(coins: number, currencyValuePerCoin: number = 10): number {
    return Math.floor(coins * currencyValuePerCoin);
  }

  static currencyToCoins(amountIdr: number, currencyValuePerCoin: number = 10): number {
    return Math.floor(amountIdr / currencyValuePerCoin);
  }

  /**
   * Process lazy activation of pending grants and lazy expiration of stale grants for a user.
  /**
   * Process lazy activation of pending grants and lazy expiration of stale grants for a user.
   */
  static async syncUserGrants(userId: string, prismaTx?: any): Promise<void> {
    const client = prismaTx || db;
    const now = new Date();

    // 1. Check if there are any PENDING grants ready for activation
    const pendingCount = await client.coinGrant.count({
      where: {
        userId,
        status: CoinGrantStatus.PENDING,
        availableAt: { lte: now },
      },
    });

    if (pendingCount > 0) {
      await client.coinGrant.updateMany({
        where: {
          userId,
          status: CoinGrantStatus.PENDING,
          availableAt: { lte: now },
        },
        data: {
          status: CoinGrantStatus.AVAILABLE,
        },
      });
    }

    // 2. Lazy expire AVAILABLE grants whose expiresAt <= now
    const expiredGrants = await client.coinGrant.findMany({
      where: {
        userId,
        status: CoinGrantStatus.AVAILABLE,
        expiresAt: { lte: now },
        coinsRemaining: { gt: 0 },
      },
    });

    if (expiredGrants.length > 0) {
      for (const grant of expiredGrants) {
        await client.coinGrant.update({
          where: { id: grant.id },
          data: {
            status: CoinGrantStatus.EXPIRED,
            coinsRemaining: 0,
          },
        });

        // Append ledger entry for expiration
        const currentBalance = await this.getCachedUserBalance(userId, client);
        await client.coinLedgerEntry.create({
          data: {
            userId,
            type: CoinLedgerType.EXPIRE,
            amountCoins: -grant.coinsRemaining,
            balanceAfter: Math.max(0, currentBalance - grant.coinsRemaining),
            sourceType: 'EXPIRATION',
            sourceId: grant.id,
            description: `${grant.coinsRemaining} Coin expired`,
            expiresAt: grant.expiresAt,
          },
        });
      }
    }
  }

  /**
   * Internal helper to get cached active user available balance (net of active reservations)
   */
  private static async getCachedUserBalance(userId: string, client: any): Promise<number> {
    const now = new Date();
    const [availableAgg, reservedAgg] = await Promise.all([
      client.coinGrant.aggregate({
        where: {
          userId,
          status: CoinGrantStatus.AVAILABLE,
          availableAt: { lte: now },
          expiresAt: { gt: now },
        },
        _sum: { coinsRemaining: true },
      }),
      client.coinReservation.aggregate({
        where: {
          userId,
          status: CoinReservationStatus.ACTIVE,
          expiresAt: { gt: now },
        },
        _sum: { reservedCoins: true },
      }),
    ]);

    const raw = availableAgg._sum.coinsRemaining || 0;
    const reserved = reservedAgg._sum.reservedCoins || 0;
    return Math.max(0, raw - reserved);
  }

  /**
   * Fast, lightweight read-only available coin balance for layout, navbar, and dashboard
   */
  static async getAvailableCoinBalance(userId: string, prismaTx?: any): Promise<{
    availableCoins: number;
    currencyEquivalent: number;
    coinName: string;
  }> {
    const client = prismaTx || db;
    const now = new Date();
    const [settings, availableCoins] = await Promise.all([
      this.getSettings(client),
      this.getCachedUserBalance(userId, client),
    ]);

    const currencyEquivalent = this.coinsToCurrency(availableCoins, settings.currencyValuePerCoin);
    return {
      availableCoins,
      currencyEquivalent,
      coinName: settings.coinName,
    };
  }

  /**
   * Detailed read-only coin summary for /account/coins page
   */
  static async getCoinSummary(userId: string, prismaTx?: any) {
    const client = prismaTx || db;
    const now = new Date();
    const settingsPromise = this.getSettings(client);

    const [
      settings,
      availableAgg,
      pendingAgg,
      reservedAgg,
      earnedAgg,
      redeemedAgg,
    ] = await Promise.all([
      settingsPromise,
      // 1. Available Coins (grants remaining)
      client.coinGrant.aggregate({
        where: {
          userId,
          status: CoinGrantStatus.AVAILABLE,
          availableAt: { lte: now },
          expiresAt: { gt: now },
        },
        _sum: { coinsRemaining: true },
      }),
      // 2. Pending Coins
      client.coinGrant.aggregate({
        where: {
          userId,
          status: CoinGrantStatus.PENDING,
          availableAt: { gt: now },
        },
        _sum: { coinsRemaining: true },
      }),
      // 3. Reserved Coins (active checkout holds)
      client.coinReservation.aggregate({
        where: {
          userId,
          status: CoinReservationStatus.ACTIVE,
          expiresAt: { gt: now },
        },
        _sum: { reservedCoins: true },
      }),
      // 4. Total Earned Coins
      client.coinGrant.aggregate({
        where: {
          userId,
          status: { in: [CoinGrantStatus.AVAILABLE, CoinGrantStatus.USED, CoinGrantStatus.PENDING] },
        },
        _sum: { coins: true },
      }),
      // 5. Total Redeemed Coins
      client.coinRedemption.aggregate({
        where: { userId },
        _sum: { coinsUsed: true },
      }),
    ]);

    const rawAvailableCoins = availableAgg._sum.coinsRemaining || 0;
    const pendingCoins = pendingAgg._sum.coinsRemaining || 0;
    const reservedCoins = reservedAgg._sum.reservedCoins || 0;
    // Net available balance is total available minus currently active checkout reservations
    const availableCoins = Math.max(0, rawAvailableCoins - reservedCoins);
    const totalEarnedCoins = earnedAgg._sum.coins || 0;
    const totalRedeemedCoins = redeemedAgg._sum.coinsUsed || 0;

    // Expiring Soon Coins (within notifyBeforeExpirationDays)
    const expiryCutoff = new Date(now.getTime() + settings.notifyBeforeExpirationDays * 24 * 3600 * 1000);
    const expiringSoonAgg = await client.coinGrant.aggregate({
      where: {
        userId,
        status: CoinGrantStatus.AVAILABLE,
        availableAt: { lte: now },
        expiresAt: { gt: now, lte: expiryCutoff },
      },
      _sum: { coinsRemaining: true },
    });
    const expiringSoonCoins = expiringSoonAgg._sum.coinsRemaining || 0;

    const currencyEquivalent = this.coinsToCurrency(availableCoins, settings.currencyValuePerCoin);

    return {
      availableCoins,
      rawAvailableCoins,
      pendingCoins,
      reservedCoins,
      expiringSoonCoins,
      totalEarnedCoins,
      totalRedeemedCoins,
      currencyEquivalent,
      coinName: settings.coinName,
      currencyValuePerCoin: settings.currencyValuePerCoin,
    };
  }

  /**
   * Paginated coin ledger history for a user
   */
  static async getCoinHistory(userId: string, options?: { take?: number; skip?: number; prismaTx?: any }) {
    const client = options?.prismaTx || db;
    return await client.coinLedgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: options?.take || 100,
      skip: options?.skip || 0,
    });
  }

  /**
   * Calculate detailed coin balance for a user.
   */
  static async getUserBalance(userId: string, prismaTx?: any) {
    return await this.getCoinSummary(userId, prismaTx);
  }

  /**
   * Calculate Loyalty Earning & Redemption limits for an order before checkout.
   */
  static async calculateOrderLoyalty(params: {
    userId?: string | null;
    items: Array<{ variantId: string; quantity: number; price: number }>;
    couponDiscount?: number;
    requestedCoins?: number;
  }) {
    const settings = await this.getSettings();
    const { userId, items, couponDiscount = 0, requestedCoins = 0 } = params;

    if (!settings.enabled) {
      return {
        enabled: false,
        coinName: settings.coinName,
        availableCoins: 0,
        requestedCoins: 0,
        usableCoins: 0,
        coinDiscountAmount: 0,
        cashPayableAmount: items.reduce((s, i) => s + i.price * i.quantity, 0) - couponDiscount,
        estimatedCoinsEarned: 0,
        allowFullCoinPayment: false,
        error: null,
      };
    }

    // 1. Calculate Gross Subtotal
    const grossSubtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const netEligibleBeforeCoins = Math.max(0, grossSubtotal - couponDiscount);

    // 2. Fetch Variant Overrides
    const variantIds = items.map((i) => i.variantId);
    const variants = await db.productVariant.findMany({
      where: { id: { in: variantIds } },
    });

    let effectiveMaxRedemptionPercentage = settings.maximumRedemptionPercentage;
    let allowRedemption = settings.coinRedemptionEnabled;
    let allowEarning = settings.coinEarningEnabled;
    let effectiveRewardPercentage = settings.defaultRewardPercentage;
    let allowFullCoinPayment = settings.allowFullCoinPaymentGlobally;

    // Check variant overrides
    for (const v of variants) {
      if (v.coinRedemptionMode === CoinRedemptionMode.DISABLED) {
        allowRedemption = false;
      } else if (v.coinRedemptionMode === CoinRedemptionMode.CUSTOM && v.coinMaxRedemptionPercentage !== null) {
        effectiveMaxRedemptionPercentage = Math.min(effectiveMaxRedemptionPercentage, v.coinMaxRedemptionPercentage);
      }

      if (v.coinEarningMode === CoinEarningMode.DISABLED) {
        allowEarning = false;
      } else if (v.coinEarningMode === CoinEarningMode.CUSTOM && v.coinRewardPercentage !== null) {
        effectiveRewardPercentage = v.coinRewardPercentage;
      }

      if (v.coinFullPaymentAllowed) {
        allowFullCoinPayment = true;
      }
    }

    // 3. User Balance Check
    let userAvailableCoins = 0;
    if (userId) {
      const balance = await this.getUserBalance(userId);
      userAvailableCoins = balance.availableCoins;
    }

    if (allowFullCoinPayment) {
      effectiveMaxRedemptionPercentage = 100;
    }

    // 4. Calculate Maximum Redeemable Coins
    const maxRedemptionIdrCap = Math.floor(netEligibleBeforeCoins * (effectiveMaxRedemptionPercentage / 100));
    const maxRedeemableCoinsCap = this.currencyToCoins(maxRedemptionIdrCap, settings.currencyValuePerCoin);
    const maxUsableCoinsForUser = Math.min(userAvailableCoins, maxRedeemableCoinsCap);

    let error: string | null = null;
    let usableCoins = 0;

    if (requestedCoins > 0) {
      if (!allowRedemption) {
        error = 'COIN_REDEMPTION_DISABLED';
      } else if (couponDiscount > 0 && !settings.allowCouponWithCoins) {
        error = 'COIN_COUPON_COMBINATION_NOT_ALLOWED';
      } else if (requestedCoins < settings.minimumRedemptionCoins) {
        error = 'MINIMUM_COIN_REDEMPTION_NOT_MET';
      } else if (requestedCoins > userAvailableCoins) {
        error = 'INSUFFICIENT_COIN_BALANCE';
      } else if (requestedCoins > maxRedeemableCoinsCap) {
        error = 'MAXIMUM_COIN_REDEMPTION_EXCEEDED';
        usableCoins = maxUsableCoinsForUser;
      } else {
        usableCoins = requestedCoins;
      }
    }

    const coinDiscountAmount = this.coinsToCurrency(usableCoins, settings.currencyValuePerCoin);
    const cashPayableAmount = Math.max(0, netEligibleBeforeCoins - coinDiscountAmount);

    // 5. Calculate Estimated Reward Coins
    // Formula: Cash Eligible Amount * reward percentage
    let estimatedCoinsEarned = 0;
    if (allowEarning && cashPayableAmount > 0) {
      const rewardIdr = cashPayableAmount * (effectiveRewardPercentage / 100);
      estimatedCoinsEarned = this.currencyToCoins(rewardIdr, settings.currencyValuePerCoin);
    }

    return {
      enabled: true,
      coinName: settings.coinName,
      userAvailableCoins,
      maxRedeemableCoinsCap,
      maxUsableCoinsForUser,
      requestedCoins,
      usableCoins,
      coinDiscountAmount,
      cashPayableAmount,
      estimatedCoinsEarned,
      effectiveRewardPercentage,
      allowFullCoinPayment,
      currencyValuePerCoin: settings.currencyValuePerCoin,
      error,
    };
  }

  /**
   * Concurrency-safe Coin Reservation during checkout.
   */
  static async reserveCoinsTx(
    tx: any,
    userId: string,
    orderId: string,
    requestedCoins: number,
    expiresAt: Date
  ) {
    const settings = await this.getSettings(tx);
    await this.syncUserGrants(userId, tx);

    const now = new Date();
    // Fetch available grants in FEFO order (expiresAt asc)
    const grants = await tx.coinGrant.findMany({
      where: {
        userId,
        status: CoinGrantStatus.AVAILABLE,
        availableAt: { lte: now },
        expiresAt: { gt: now },
        coinsRemaining: { gt: 0 },
      },
      orderBy: { expiresAt: 'asc' },
    });

    const totalAvailable = grants.reduce((sum: number, g: any) => sum + g.coinsRemaining, 0);
    if (totalAvailable < requestedCoins) {
      throw new Error('INSUFFICIENT_COIN_BALANCE');
    }

    const currencyValue = this.coinsToCurrency(requestedCoins, settings.currencyValuePerCoin);

    const reservation = await tx.coinReservation.create({
      data: {
        userId,
        orderId,
        requestedCoins,
        reservedCoins: requestedCoins,
        currencyValue,
        status: CoinReservationStatus.ACTIVE,
        expiresAt,
      },
    });

    // Create RESERVE ledger entry
    const currentBalance = await this.getCachedUserBalance(userId, tx);
    await tx.coinLedgerEntry.create({
      data: {
        userId,
        type: CoinLedgerType.RESERVE,
        amountCoins: -requestedCoins,
        balanceAfter: Math.max(0, currentBalance - requestedCoins),
        sourceType: 'ORDER',
        sourceId: reservation.id,
        orderId,
        description: `Reserved ${requestedCoins} ${settings.coinName} for order`,
        expiresAt,
      },
    });

    return reservation;
  }

  /**
   * Consume Coin Reservation upon successful payment settlement.
   * Uses FEFO strategy to allocate coins from grants.
   */
  static async consumeReservationTx(tx: any, orderId: string) {
    const reservation = await tx.coinReservation.findUnique({
      where: { orderId },
    });

    if (!reservation || reservation.status !== CoinReservationStatus.ACTIVE) {
      return null; // Reservation already consumed or invalid
    }

    const settings = await this.getSettings(tx);
    const userId = reservation.userId;
    const now = new Date();

    // 1. Mark reservation as CONSUMED
    await tx.coinReservation.update({
      where: { id: reservation.id },
      data: {
        status: CoinReservationStatus.CONSUMED,
        consumedAt: now,
      },
    });

    // 2. FEFO allocation from grants
    const grants = await tx.coinGrant.findMany({
      where: {
        userId,
        status: CoinGrantStatus.AVAILABLE,
        availableAt: { lte: now },
        expiresAt: { gt: now },
        coinsRemaining: { gt: 0 },
      },
      orderBy: { expiresAt: 'asc' },
    });

    let needed = reservation.reservedCoins;
    const allocationsData: Array<{ grantId: string; coinsUsed: number }> = [];

    for (const grant of grants) {
      if (needed <= 0) break;
      const take = Math.min(grant.coinsRemaining, needed);
      needed -= take;

      const newRemaining = grant.coinsRemaining - take;
      await tx.coinGrant.update({
        where: { id: grant.id },
        data: {
          coinsRemaining: newRemaining,
          status: newRemaining === 0 ? CoinGrantStatus.USED : CoinGrantStatus.AVAILABLE,
        },
      });

      allocationsData.push({ grantId: grant.id, coinsUsed: take });
    }

    // 3. Create CoinRedemption record
    const redemption = await tx.coinRedemption.create({
      data: {
        userId,
        orderId,
        coinsUsed: reservation.reservedCoins,
        currencyValue: reservation.currencyValue,
        coinValuePerUnit: settings.currencyValuePerCoin,
        allocations: {
          createMany: {
            data: allocationsData,
          },
        },
      },
    });

    // 4. Create REDEEM ledger entry
    const currentBalance = await this.getCachedUserBalance(userId, tx);
    await tx.coinLedgerEntry.create({
      data: {
        userId,
        type: CoinLedgerType.REDEEM,
        amountCoins: -reservation.reservedCoins,
        balanceAfter: currentBalance,
        sourceType: 'ORDER',
        sourceId: redemption.id,
        orderId,
        description: `Redeemed ${reservation.reservedCoins} ${settings.coinName} for order #${orderId}`,
      },
    });

    return redemption;
  }

  /**
   * Release Coin Reservation when payment expires or order is cancelled.
   */
  static async releaseReservationTx(tx: any, orderId: string, reason: string = 'ORDER_EXPIRED') {
    const reservation = await tx.coinReservation.findUnique({
      where: { orderId },
    });

    if (!reservation || reservation.status !== CoinReservationStatus.ACTIVE) {
      return null;
    }

    const settings = await this.getSettings(tx);

    // Update reservation status to RELEASED
    await tx.coinReservation.update({
      where: { id: reservation.id },
      data: {
        status: CoinReservationStatus.RELEASED,
        releasedAt: new Date(),
      },
    });

    // Create RELEASE ledger entry to restore user balance
    const currentBalance = await this.getCachedUserBalance(reservation.userId, tx);
    await tx.coinLedgerEntry.create({
      data: {
        userId: reservation.userId,
        type: CoinLedgerType.RELEASE,
        amountCoins: reservation.reservedCoins,
        balanceAfter: currentBalance + reservation.reservedCoins,
        sourceType: 'ORDER',
        sourceId: reservation.id,
        orderId,
        description: `Released ${reservation.reservedCoins} ${settings.coinName} (${reason})`,
      },
    });
  }

  /**
   * Award Purchase Reward Coins when order completes.
   * Formula: Net Cash Payable * Reward % = Reward IDR -> Coins
   * Reward starts as PENDING for pendingPeriodDays (default 7 days).
   */
  static async awardPurchaseRewardTx(tx: any, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { variant: true } } },
    });

    if (!order || !order.userId) return null; // Guest order doesn't get customer coins automatically

    const settings = await this.getSettings(tx);
    if (!settings.enabled || !settings.coinEarningEnabled) return null;

    // Check idempotency: check if reward grant already exists for this order
    const existingGrant = await tx.coinGrant.findFirst({
      where: {
        userId: order.userId,
        orderId,
        sourceType: 'ORDER_REWARD',
      },
    });

    if (existingGrant) return existingGrant;

    // Net Cash Eligible Amount (order.cashPayableAmount)
    const netCashPaid = order.cashPayableAmount || Math.max(0, order.grandTotal);
    if (netCashPaid <= 0) return null; // 0 cash paid gives 0 reward

    // Determine reward percentage
    let rewardPercentage = settings.defaultRewardPercentage;
    for (const item of order.items) {
      if (item.variant.coinEarningMode === CoinEarningMode.DISABLED) {
        rewardPercentage = 0;
        break;
      } else if (item.variant.coinEarningMode === CoinEarningMode.CUSTOM && item.variant.coinRewardPercentage !== null) {
        rewardPercentage = item.variant.coinRewardPercentage;
      }
    }

    if (rewardPercentage <= 0) return null;

    const rewardIdr = netCashPaid * (rewardPercentage / 100);
    const baseCoinsEarned = this.currencyToCoins(rewardIdr, settings.currencyValuePerCoin);

    if (baseCoinsEarned <= 0) return null;

    // Apply Loyalty Tier Multiplier
    const { LoyaltyTierService } = await import('./loyaltyTier.service');
    const { MilestoneService } = await import('./milestone.service');

    const benefits = await LoyaltyTierService.getTierBenefits(order.userId);
    const tierMultiplier = benefits.coinMultiplier || 1.0;
    const finalCoinsEarned = Math.floor(baseCoinsEarned * tierMultiplier);

    const now = new Date();
    const availableAt = new Date(now.getTime() + (settings.pendingPeriodDays || 0) * 24 * 3600 * 1000);
    const expiresAt = new Date(availableAt.getTime() + (settings.expirationDays || 365) * 24 * 3600 * 1000);
    const initialGrantStatus = availableAt <= now ? CoinGrantStatus.AVAILABLE : CoinGrantStatus.PENDING;

    // Create grant with final Coins & initial status
    const grant = await tx.coinGrant.create({
      data: {
        userId: order.userId,
        sourceType: 'ORDER_REWARD',
        sourceId: order.id,
        orderId: order.id,
        coins: finalCoinsEarned,
        coinsRemaining: finalCoinsEarned,
        status: initialGrantStatus,
        availableAt,
        expiresAt,
      },
    });

    // Update order with earned coin snapshot & tier info
    await tx.order.update({
      where: { id: order.id },
      data: {
        rewardPercentageSnapshot: rewardPercentage,
        eligibleRewardAmount: netCashPaid,
        coinsEarned: finalCoinsEarned,
        tierCoinMultiplierSnapshot: tierMultiplier,
      },
    });

    // Trigger tier & milestone evaluations
    await LoyaltyTierService.evaluateCustomerTier(tx, order.userId);
    await MilestoneService.evaluateMilestones(tx, order.userId);

    // Create EARN ledger entry
    const currentBalance = await this.getCachedUserBalance(order.userId, tx);
    await tx.coinLedgerEntry.create({
      data: {
        userId: order.userId,
        type: CoinLedgerType.EARN,
        amountCoins: finalCoinsEarned,
        balanceAfter: currentBalance, // Pending coins don't increase available balance until active
        sourceType: 'ORDER',
        sourceId: grant.id,
        orderId,
        description: `Earned ${finalCoinsEarned} ${settings.coinName} from order #${order.orderNumber} (Pending 7 days)`,
        availableAt,
        expiresAt,
      },
    });

    return grant;
  }

  /**
   * Refund order coins & reverse purchase reward upon order refund/cancellation.
   */
  static async refundOrderCoinsTx(tx: any, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { coinRedemption: true },
    });

    if (!order) return;

    const settings = await this.getSettings(tx);
    const now = new Date();

    // 1. Reverse pending or available purchase reward
    if (order.userId) {
      const rewardGrants = await tx.coinGrant.findMany({
        where: {
          userId: order.userId,
          orderId,
          sourceType: 'ORDER_REWARD',
        },
      });

      for (const grant of rewardGrants) {
        if (grant.status === CoinGrantStatus.PENDING) {
          await tx.coinGrant.update({
            where: { id: grant.id },
            data: { status: CoinGrantStatus.REVERSED, coinsRemaining: 0 },
          });

          await tx.coinLedgerEntry.create({
            data: {
              userId: order.userId,
              type: CoinLedgerType.REVERSAL,
              amountCoins: -grant.coins,
              balanceAfter: await this.getCachedUserBalance(order.userId, tx),
              sourceType: 'ORDER',
              sourceId: grant.id,
              orderId,
              description: `Reversed pending reward of ${grant.coins} ${settings.coinName} for order #${order.orderNumber}`,
            },
          });
        } else if (grant.status === CoinGrantStatus.AVAILABLE) {
          await tx.coinGrant.update({
            where: { id: grant.id },
            data: { status: CoinGrantStatus.REVERSED, coinsRemaining: 0 },
          });

          const currentBal = await this.getCachedUserBalance(order.userId, tx);
          await tx.coinLedgerEntry.create({
            data: {
              userId: order.userId,
              type: CoinLedgerType.REVERSAL,
              amountCoins: -grant.coins,
              balanceAfter: Math.max(0, currentBal - grant.coins),
              sourceType: 'ORDER',
              sourceId: grant.id,
              orderId,
              description: `Reversed reward of ${grant.coins} ${settings.coinName} for order #${order.orderNumber}`,
            },
          });
        }
      }
    }

    // 2. Return redeemed coins back to user as REFUND_RETURN grant
    if (order.userId && order.coinRedemption) {
      const coinsToReturn = order.coinRedemption.coinsUsed;
      if (coinsToReturn > 0) {
        const minValidityDays = settings.returnedCoinMinimumValidityDays || 30;
        const expiresAt = new Date(now.getTime() + minValidityDays * 24 * 3600 * 1000);

        const returnedGrant = await tx.coinGrant.create({
          data: {
            userId: order.userId,
            sourceType: 'REFUND_RETURN',
            sourceId: order.coinRedemption.id,
            orderId,
            coins: coinsToReturn,
            coinsRemaining: coinsToReturn,
            status: CoinGrantStatus.AVAILABLE,
            availableAt: now,
            expiresAt,
          },
        });

        const currentBal = await this.getCachedUserBalance(order.userId, tx);
        await tx.coinLedgerEntry.create({
          data: {
            userId: order.userId,
            type: CoinLedgerType.REFUND_RETURN,
            amountCoins: coinsToReturn,
            balanceAfter: currentBal + coinsToReturn,
            sourceType: 'ORDER',
            sourceId: returnedGrant.id,
            orderId,
            description: `Returned ${coinsToReturn} ${settings.coinName} from refunded order #${order.orderNumber}`,
            expiresAt,
          },
        });
      }
    }
  }

  /**
   * Admin manual coin adjustment (Credit / Debit user balance).
   */
  static async adminAdjustCoins(params: {
    actorId: string;
    userId: string;
    amountCoins: number;
    type: 'ADD' | 'DEDUCT';
    reason: string;
  }) {
    const { actorId, userId, amountCoins, type, reason } = params;
    const settings = await this.getSettings();
    const now = new Date();

    return await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('Pelanggan tidak ditemukan');

      if (type === 'ADD') {
        const expiresAt = new Date(now.getTime() + settings.expirationDays * 24 * 3600 * 1000);
        const grant = await tx.coinGrant.create({
          data: {
            userId,
            sourceType: 'MANUAL_ADJUSTMENT',
            sourceId: actorId,
            coins: amountCoins,
            coinsRemaining: amountCoins,
            status: CoinGrantStatus.AVAILABLE,
            availableAt: now,
            expiresAt,
          },
        });

        const currentBal = await this.getCachedUserBalance(userId, tx);
        await tx.coinLedgerEntry.create({
          data: {
            userId,
            type: CoinLedgerType.ADJUSTMENT_ADD,
            amountCoins: amountCoins,
            balanceAfter: currentBal + amountCoins,
            sourceType: 'ADMIN_MANUAL',
            sourceId: grant.id,
            description: `Admin manual add: ${reason}`,
            expiresAt,
          },
        });

        await AuditService.log({
          actorId,
          action: 'ADMIN_ADD_COINS',
          entity: 'User',
          entityId: userId,
          after: { amountCoins, reason, grantId: grant.id },
        });

        return grant;
      } else {
        // DEDUCT coins from available grants in FEFO order
        const grants = await tx.coinGrant.findMany({
          where: {
            userId,
            status: CoinGrantStatus.AVAILABLE,
            availableAt: { lte: now },
            expiresAt: { gt: now },
            coinsRemaining: { gt: 0 },
          },
          orderBy: { expiresAt: 'asc' },
        });

        let needed = amountCoins;
        for (const grant of grants) {
          if (needed <= 0) break;
          const take = Math.min(grant.coinsRemaining, needed);
          needed -= take;

          const newRem = grant.coinsRemaining - take;
          await tx.coinGrant.update({
            where: { id: grant.id },
            data: {
              coinsRemaining: newRem,
              status: newRem === 0 ? CoinGrantStatus.USED : CoinGrantStatus.AVAILABLE,
            },
          });
        }

        const currentBal = await this.getCachedUserBalance(userId, tx);
        const entry = await tx.coinLedgerEntry.create({
          data: {
            userId,
            type: CoinLedgerType.ADJUSTMENT_DEDUCT,
            amountCoins: -amountCoins,
            balanceAfter: currentBal,
            sourceType: 'ADMIN_MANUAL',
            sourceId: actorId,
            description: `Admin manual deduct: ${reason}`,
          },
        });

        await AuditService.log({
          actorId,
          action: 'ADMIN_DEDUCT_COINS',
          entity: 'User',
          entityId: userId,
          after: { amountCoins, reason, entryId: entry.id },
        });

        return entry;
      }
    });
  }

  /**
   * Helper method to grant coins to a user within a transaction
   */
  static async grantCoinsTx(
    tx: any,
    userId: string,
    coins: number,
    sourceType: string,
    description: string,
    expirationDays = 365
  ) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationDays * 24 * 3600 * 1000);

    const grant = await tx.coinGrant.create({
      data: {
        userId,
        sourceType,
        coins,
        coinsRemaining: coins,
        status: CoinGrantStatus.AVAILABLE,
        availableAt: now,
        expiresAt,
      },
    });

    const balanceAfter = await this.getCachedUserBalance(userId, tx);

    await tx.coinLedgerEntry.create({
      data: {
        userId,
        type: CoinLedgerType.EARN,
        amountCoins: coins,
        balanceAfter,
        sourceType,
        sourceId: grant.id,
        description,
      },
    });

    return grant;
  }

  /**
   * Helper method to reverse a coin grant
   */
  static async reverseGrantTx(tx: any, grantId: string, reason: string) {
    const grant = await tx.coinGrant.findUnique({
      where: { id: grantId },
    });

    if (!grant) return;

    await tx.coinGrant.update({
      where: { id: grantId },
      data: {
        status: CoinGrantStatus.REVERSED,
        coinsRemaining: 0,
      },
    });

    const balanceAfter = await this.getCachedUserBalance(grant.userId, tx);

    await tx.coinLedgerEntry.create({
      data: {
        userId: grant.userId,
        type: CoinLedgerType.REVERSAL,
        amountCoins: -grant.coins,
        balanceAfter,
        sourceType: 'REVERSAL',
        sourceId: grantId,
        description: `Reversal of grant #${grantId}: ${reason}`,
      },
    });
  }
}
