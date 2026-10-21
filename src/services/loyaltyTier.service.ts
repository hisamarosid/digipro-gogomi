import { db } from '@/lib/db/prisma';
import { OrderStatus, TierStatus } from '../../generated/prisma';
import { NotificationService } from './notification.service';
import { CustomerNotificationCategory } from '../../generated/prisma';

export interface TierBenefitSummary {
  tierName: string;
  badgeLabel: string;
  rank: number;
  coinMultiplier: number;
  maxCoinRedemptionOverride: number | null;
  renewalDiscountPercentage: number;
  prioritySupportEnabled: boolean;
  replacementCooldownMultiplier: number;
}

export class LoyaltyTierService {
  /**
   * Seed/Ensure default tiers exist in DB
   */
  static async ensureDefaultTiers(tx?: any) {
    const client = tx || db;
    const defaultTiers = [
      {
        slug: 'bronze',
        name: 'Bronze Member',
        rank: 1,
        minimumSpend: 0,
        coinRewardMultiplier: 1.0,
        maxCoinRedemptionPercentageOverride: 30,
        renewalDiscountPercentage: 0,
        prioritySupportEnabled: false,
        replacementCooldownMultiplier: 1.0,
        badgeLabel: 'Bronze Member',
        description: 'Level dasar keanggotaan Gogomi Store.',
      },
      {
        slug: 'silver',
        name: 'Silver Member',
        rank: 2,
        minimumSpend: 500000, // Rp500.000
        coinRewardMultiplier: 1.1,
        maxCoinRedemptionPercentageOverride: 35,
        renewalDiscountPercentage: 2.5,
        prioritySupportEnabled: false,
        replacementCooldownMultiplier: 0.9,
        badgeLabel: 'Silver Member',
        description: 'Level Silver dengan bonus 1.1x koin & diskon perpanjangan 2.5%.',
      },
      {
        slug: 'gold',
        name: 'Gold Member',
        rank: 3,
        minimumSpend: 1500000, // Rp1.500.000
        coinRewardMultiplier: 1.25,
        maxCoinRedemptionPercentageOverride: 40,
        renewalDiscountPercentage: 5.0,
        prioritySupportEnabled: true,
        replacementCooldownMultiplier: 0.8,
        badgeLabel: 'Gold VIP Member',
        description: 'Level Gold VIP dengan bonus 1.25x koin, diskon perpanjangan 5%, dan Prioritas CS.',
      },
      {
        slug: 'platinum',
        name: 'Platinum Member',
        rank: 4,
        minimumSpend: 5000000, // Rp5.000.000
        coinRewardMultiplier: 1.5,
        maxCoinRedemptionPercentageOverride: 50,
        renewalDiscountPercentage: 10.0,
        prioritySupportEnabled: true,
        replacementCooldownMultiplier: 0.75,
        badgeLabel: 'Platinum Sultan Member',
        description: 'Level tertinggi Platinum Sultan dengan 1.5x koin, diskon perpanjangan 10%, dan CS Prioritas.',
      },
    ];

    for (const t of defaultTiers) {
      await client.loyaltyTier.upsert({
        where: { slug: t.slug },
        update: {},
        create: t,
      });
    }
  }

  /**
   * Calculate customer lifetime completed spend & update tier status
   */
  static async evaluateCustomerTier(tx: any, userId: string) {
    if (!userId) return null;
    await this.ensureDefaultTiers(tx);

    // 1. Calculate eligible completed cash spend
    const completedOrders = await tx.order.findMany({
      where: {
        userId,
        status: OrderStatus.COMPLETED,
      },
      select: {
        cashPayableAmount: true,
      },
    });

    const totalSpend = completedOrders.reduce((sum: number, o: any) => sum + (o.cashPayableAmount || 0), 0);
    const orderCount = completedOrders.length;

    // 2. Fetch all active tiers ordered by minimumSpend DESC
    const activeTiers = await tx.loyaltyTier.findMany({
      where: { status: TierStatus.ACTIVE },
      orderBy: { minimumSpend: 'desc' },
    });

    if (activeTiers.length === 0) return null;

    // 3. Find highest qualifying tier
    const qualifyingTier = activeTiers.find((t: any) => totalSpend >= t.minimumSpend) || activeTiers[activeTiers.length - 1];

    // 4. Fetch current user tier record
    const currentRecord = await tx.customerLoyaltyTier.findUnique({
      where: { userId },
      include: { tier: true },
    });

    const previousTierId = currentRecord?.tierId || null;
    const now = new Date();

    if (!currentRecord) {
      // First tier assignment
      const newRecord = await tx.customerLoyaltyTier.create({
        data: {
          userId,
          tierId: qualifyingTier.id,
          qualifiedSpend: totalSpend,
          completedOrders: orderCount,
          assignedAt: now,
          lastEvaluatedAt: now,
          upgradeReason: 'INITIAL_ASSIGNMENT',
        },
      });

      await tx.customerLoyaltyTierHistory.create({
        data: {
          userId,
          fromTierId: null,
          toTierId: qualifyingTier.id,
          reason: 'Initial Tier Assignment',
          qualifiedSpendSnapshot: totalSpend,
          changedAt: now,
        },
      });

      return newRecord;
    }

    // Check if tier rank has changed
    const isUpgrade = qualifyingTier.rank > (currentRecord.tier?.rank || 0);
    const isDowngrade = qualifyingTier.rank < (currentRecord.tier?.rank || 0);

    if (previousTierId !== qualifyingTier.id) {
      // Update Customer Loyalty Tier
      const updatedRecord = await tx.customerLoyaltyTier.update({
        where: { userId },
        data: {
          tierId: qualifyingTier.id,
          qualifiedSpend: totalSpend,
          completedOrders: orderCount,
          previousTierId,
          lastEvaluatedAt: now,
          assignedAt: now,
          upgradeReason: isUpgrade ? 'QUALIFIED_SPEND_THRESHOLD_REACHED' : 'REFUND_RECALCULATION',
        },
      });

      // Record immutable tier history
      await tx.customerLoyaltyTierHistory.create({
        data: {
          userId,
          fromTierId: previousTierId,
          toTierId: qualifyingTier.id,
          reason: isUpgrade ? `Naik Tier ke ${qualifyingTier.name}` : `Penyesuaian Tier ke ${qualifyingTier.name}`,
          qualifiedSpendSnapshot: totalSpend,
          changedAt: now,
        },
      });

      // Dispatch in-app customer notification if upgraded
      if (isUpgrade) {
        await NotificationService.sendCustomerNotification({
          userId,
          type: 'LOYALTY_TIER_UPGRADED',
          category: CustomerNotificationCategory.PROMOTION,
          title: `🏆 Selamat! Anda Naik Ke Tier ${qualifyingTier.name}!`,
          message: `Selamat! Total transaksi Anda mencapai Rp${totalSpend.toLocaleString('id-ID')}. Anda kini menikmati multiplier koin ${qualifyingTier.coinRewardMultiplier}x dan keuntungan VIP lainnya.`,
          actionUrl: '/account/loyalty',
        });
      }

      return updatedRecord;
    } else {
      // Update metrics only
      return tx.customerLoyaltyTier.update({
        where: { userId },
        data: {
          qualifiedSpend: totalSpend,
          completedOrders: orderCount,
          lastEvaluatedAt: now,
        },
      });
    }
  }

  /**
   * Get user loyalty status & progress info
   */
  static async getUserLoyaltyStatus(userId: string) {
    await this.ensureDefaultTiers();

    let record = await db.customerLoyaltyTier.findUnique({
      where: { userId },
      include: { tier: true },
    });

    if (!record) {
      // Initialize Bronze tier if not present
      const bronzeTier = await db.loyaltyTier.findFirst({ where: { slug: 'bronze' } });
      if (bronzeTier) {
        record = await db.customerLoyaltyTier.create({
          data: {
            userId,
            tierId: bronzeTier.id,
            qualifiedSpend: 0,
            completedOrders: 0,
          },
          include: { tier: true },
        });
      }
    }

    const currentTier = record?.tier;
    const allTiers = await db.loyaltyTier.findMany({
      where: { status: TierStatus.ACTIVE },
      orderBy: { rank: 'asc' },
    });

    const currentRank = currentTier?.rank || 1;
    const nextTier = allTiers.find((t) => t.rank > currentRank);

    const currentSpend = record?.qualifiedSpend || 0;
    const spendToNextTier = nextTier ? Math.max(0, nextTier.minimumSpend - currentSpend) : 0;
    const progressPercentage = nextTier && nextTier.minimumSpend > 0
      ? Math.min(100, Math.floor((currentSpend / nextTier.minimumSpend) * 100))
      : 100;

    const history = await db.customerLoyaltyTierHistory.findMany({
      where: { userId },
      orderBy: { changedAt: 'desc' },
      take: 10,
    });

    return {
      currentTier,
      qualifiedSpend: currentSpend,
      completedOrders: record?.completedOrders || 0,
      nextTier,
      spendToNextTier,
      progressPercentage,
      history,
      allTiers,
    };
  }

  /**
   * Get Tier Benefits summary for pricing & system engines
   */
  static async getTierBenefits(userId?: string | null): Promise<TierBenefitSummary> {
    if (!userId) {
      return {
        tierName: 'Guest / Bronze',
        badgeLabel: 'Bronze Member',
        rank: 1,
        coinMultiplier: 1.0,
        maxCoinRedemptionOverride: null,
        renewalDiscountPercentage: 0,
        prioritySupportEnabled: false,
        replacementCooldownMultiplier: 1.0,
      };
    }

    const record = await db.customerLoyaltyTier.findUnique({
      where: { userId },
      include: { tier: true },
    });

    const tier = record?.tier;

    return {
      tierName: tier?.name || 'Bronze Member',
      badgeLabel: tier?.badgeLabel || 'Bronze Member',
      rank: tier?.rank || 1,
      coinMultiplier: tier?.coinRewardMultiplier || 1.0,
      maxCoinRedemptionOverride: tier?.maxCoinRedemptionPercentageOverride || null,
      renewalDiscountPercentage: tier?.renewalDiscountPercentage || 0,
      prioritySupportEnabled: tier?.prioritySupportEnabled || false,
      replacementCooldownMultiplier: tier?.replacementCooldownMultiplier || 1.0,
    };
  }
}
