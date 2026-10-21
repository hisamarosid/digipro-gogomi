import { db } from '@/lib/db/prisma';
import { MilestoneRewardType, MilestoneTriggerType, OrderStatus, TierStatus } from '../../generated/prisma';
import { LoyaltyService } from './loyalty.service';
import { NotificationService } from './notification.service';
import { CustomerNotificationCategory } from '../../generated/prisma';

export class MilestoneService {
  /**
   * Seed default purchase milestone definitions
   */
  static async ensureDefaultMilestones(tx?: any) {
    const client = tx || db;
    const defaultMilestones = [
      {
        name: 'Pembelian Pertama (First Purchase)',
        triggerType: MilestoneTriggerType.COMPLETED_ORDER_COUNT,
        triggerValue: 1,
        rewardType: MilestoneRewardType.BONUS_COIN,
        rewardValue: 200,
        status: TierStatus.ACTIVE,
        oncePerCustomer: true,
      },
      {
        name: 'Setia Belanja (5 Pembelian Selesai)',
        triggerType: MilestoneTriggerType.COMPLETED_ORDER_COUNT,
        triggerValue: 5,
        rewardType: MilestoneRewardType.BONUS_COIN,
        rewardValue: 500,
        status: TierStatus.ACTIVE,
        oncePerCustomer: true,
      },
      {
        name: 'Langganan Setia (10 Pembelian Selesai)',
        triggerType: MilestoneTriggerType.COMPLETED_ORDER_COUNT,
        triggerValue: 10,
        rewardType: MilestoneRewardType.BONUS_COIN,
        rewardValue: 1000,
        status: TierStatus.ACTIVE,
        oncePerCustomer: true,
      },
      {
        name: 'Total Transaksi Rp1.000.000',
        triggerType: MilestoneTriggerType.LIFETIME_SPEND,
        triggerValue: 1000000,
        rewardType: MilestoneRewardType.BONUS_COIN,
        rewardValue: 1500,
        status: TierStatus.ACTIVE,
        oncePerCustomer: true,
      },
    ];

    for (const m of defaultMilestones) {
      const existing = await client.loyaltyMilestone.findFirst({
        where: { name: m.name },
      });
      if (!existing) {
        await client.loyaltyMilestone.create({ data: m });
      }
    }
  }

  /**
   * Evaluate customer milestones upon completed order
   */
  static async evaluateMilestones(tx: any, userId: string) {
    if (!userId) return;
    await this.ensureDefaultMilestones(tx);

    // Calculate customer metrics
    const completedOrders = await tx.order.findMany({
      where: {
        userId,
        status: OrderStatus.COMPLETED,
      },
      select: { cashPayableAmount: true },
    });

    const completedCount = completedOrders.length;
    const totalSpend = completedOrders.reduce((sum: number, o: any) => sum + (o.cashPayableAmount || 0), 0);

    // Fetch active milestone definitions
    const activeMilestones = await tx.loyaltyMilestone.findMany({
      where: { status: TierStatus.ACTIVE },
    });

    for (const milestone of activeMilestones) {
      let isMet = false;
      if (milestone.triggerType === MilestoneTriggerType.COMPLETED_ORDER_COUNT) {
        isMet = completedCount >= milestone.triggerValue;
      } else if (milestone.triggerType === MilestoneTriggerType.LIFETIME_SPEND) {
        isMet = totalSpend >= milestone.triggerValue;
      }

      if (!isMet) continue;

      // Check idempotency (prevent duplicate milestone rewards)
      const existingReward = await tx.customerMilestoneReward.findUnique({
        where: {
          userId_milestoneId: {
            userId,
            milestoneId: milestone.id,
          },
        },
      });

      if (existingReward) continue;

      let coinGrantId: string | null = null;
      if (milestone.rewardType === MilestoneRewardType.BONUS_COIN) {
        const grant = await LoyaltyService.grantCoinsTx(
          tx,
          userId,
          milestone.rewardValue,
          'MILESTONE_REWARD',
          `Bonus Milestone: ${milestone.name}`,
          365
        );
        coinGrantId = grant.id;
      }

      // Record issuance
      await tx.customerMilestoneReward.create({
        data: {
          userId,
          milestoneId: milestone.id,
          rewardType: milestone.rewardType,
          rewardValue: milestone.rewardValue,
          coinGrantId,
        },
      });

      // Dispatch in-app customer notification
      await NotificationService.sendCustomerNotification({
        userId,
        type: 'MILESTONE_REACHED',
        category: CustomerNotificationCategory.COIN,
        title: `🎉 Milestone Terpenuhi: ${milestone.name}!`,
        message: `Selamat! Anda berhasil mencapai milestone "${milestone.name}" dan mendapatkan bonus +${milestone.rewardValue} Store Coins!`,
        actionUrl: '/account/loyalty',
      });
    }
  }

  /**
   * Get user earned & upcoming milestones
   */
  static async getUserMilestones(userId: string) {
    await this.ensureDefaultMilestones();

    const allMilestones = await db.loyaltyMilestone.findMany({
      where: { status: TierStatus.ACTIVE },
      orderBy: { triggerValue: 'asc' },
    });

    const earnedRewards = await db.customerMilestoneReward.findMany({
      where: { userId },
    });

    const earnedSet = new Set(earnedRewards.map((r) => r.milestoneId));

    return allMilestones.map((m) => ({
      id: m.id,
      name: m.name,
      triggerType: m.triggerType,
      triggerValue: m.triggerValue,
      rewardType: m.rewardType,
      rewardValue: m.rewardValue,
      isEarned: earnedSet.has(m.id),
    }));
  }
}
