import { db } from '@/lib/db/prisma';
import { OrderStatus, Role } from '../../generated/prisma';

export class CustomerGrowthService {
  /**
   * Get Growth & Customer Conversion Analytics KPI summary for Admin Dashboard
   */
  static async getGrowthAnalytics() {
    const totalCustomers = await db.user.count({
      where: { role: Role.CUSTOMER },
    });

    // 1. Repeat Purchase Rate
    const customerOrderCounts = await db.order.groupBy({
      by: ['userId'],
      where: {
        userId: { not: null },
        status: OrderStatus.COMPLETED,
      },
      _count: { id: true },
    });

    const repeatCustomers = customerOrderCounts.filter((c) => c._count.id > 1).length;
    const buyersCount = customerOrderCounts.length;
    const repeatPurchaseRate = buyersCount > 0 ? (repeatCustomers / buyersCount) * 100 : 0;

    // 2. Loyalty Tier Distribution
    const tierRecords = await db.customerLoyaltyTier.findMany({
      include: { tier: true },
    });

    const tierDistribution: Record<string, number> = {};
    tierRecords.forEach((r) => {
      const name = r.tier.name;
      tierDistribution[name] = (tierDistribution[name] || 0) + 1;
    });

    // 3. Wishlist Conversion Rate
    const totalWishlistItems = await db.wishlistItem.count();
    const influencedOrdersCount = await db.order.count({
      where: {
        wishlistInfluenced: true,
        status: OrderStatus.COMPLETED,
      },
    });
    const wishlistConversionRate = totalWishlistItems > 0 ? (influencedOrdersCount / totalWishlistItems) * 100 : 0;

    // 4. Price Drop Watch Count
    const totalPriceWatches = await db.priceWatch.count();

    // 5. Historical Customer Lifetime Value (CLV proxy)
    const completedOrders = await db.order.aggregate({
      where: { status: OrderStatus.COMPLETED },
      _sum: { cashPayableAmount: true },
    });

    const totalRevenue = completedOrders._sum.cashPayableAmount || 0;
    const averageCLV = buyersCount > 0 ? Math.round(totalRevenue / buyersCount) : 0;

    return {
      totalCustomers,
      buyersCount,
      repeatCustomers,
      repeatPurchaseRate: Number(repeatPurchaseRate.toFixed(1)),
      tierDistribution,
      totalWishlistItems,
      wishlistConversionRate: Number(wishlistConversionRate.toFixed(1)),
      totalPriceWatches,
      totalRevenue,
      averageCLV,
    };
  }

  /**
   * Classify customer into behavioral commerce segments
   */
  static async getCustomerSegment(userId: string): Promise<string[]> {
    const segments: string[] = [];

    const completedOrders = await db.order.findMany({
      where: {
        userId,
        status: OrderStatus.COMPLETED,
      },
    });

    const completedCount = completedOrders.length;
    const totalSpend = completedOrders.reduce((sum, o) => sum + (o.cashPayableAmount || 0), 0);

    if (completedCount === 0) {
      segments.push('NEW_CUSTOMER');
    } else if (completedCount === 1) {
      segments.push('FIRST_TIME_BUYER');
    } else {
      segments.push('RETURNING_CUSTOMER');
    }

    if (totalSpend >= 1500000) {
      segments.push('HIGH_VALUE');
    }

    // Check tier
    const loyaltyRecord = await db.customerLoyaltyTier.findUnique({
      where: { userId },
      include: { tier: true },
    });

    if (loyaltyRecord && (loyaltyRecord.tier.slug === 'gold' || loyaltyRecord.tier.slug === 'platinum')) {
      segments.push('LOYALTY_GOLD_PLUS');
    }

    return segments;
  }
}
