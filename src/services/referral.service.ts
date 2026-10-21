import { db } from '@/lib/db/prisma';
import { ReferralRiskReason, ReferralStatus } from '../../generated/prisma';
import { LoyaltyService } from './loyalty.service';
import { DomainEventService } from './domainEvent.service';

export class ReferralService {
  /**
   * Generates or retrieves unique referral code for a user (e.g. FADLI8X3)
   */
  static async getOrCreateUserReferralCode(userId: string): Promise<string> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, name: true },
    });

    if (user?.referralCode) {
      return user.referralCode;
    }

    const cleanName = (user?.name || 'USER').replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    let code = `${cleanName}${randomSuffix}`;

    // Ensure uniqueness
    const existing = await db.user.findUnique({ where: { referralCode: code } });
    if (existing) {
      code = `GOGO${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    await db.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });

    return code;
  }

  /**
   * Evaluates if a completed order qualifies for referral reward
   */
  static async evaluateQualifyingOrder(tx: any, orderId: string) {
    try {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { user: true },
      });

      if (!order || !order.userId || !order.user) return;

      const settings = await tx.referralProgramSettings.findUnique({ where: { id: 'default' } }) || {
        enabled: true,
        minimumCashPurchaseAmount: 50000,
        referrerRewardCoins: 500,
        newCustomerRewardCoins: 200,
        rewardHoldDays: 7,
        coinOnlyOrderQualifies: false,
      };

      if (!settings.enabled) return;

      // 1. Check if user was referred
      const referredUser = order.user;
      if (!referredUser.referredByUserId) return;

      // 2. Prevent self-referral
      if (referredUser.referredByUserId === referredUser.id) {
        return;
      }

      // 3. Verify minimum cash purchase amount
      const cashPaid = order.cashPayableAmount || 0;
      if (cashPaid < settings.minimumCashPurchaseAmount) {
        return;
      }

      // 4. Verify first qualifying purchase (Unique constraint per referred customer)
      const existingReward = await tx.referralReward.findFirst({
        where: { referredUserId: referredUser.id },
      });

      if (existingReward) return;

      // 5. Create ReferralReward record in PENDING state
      const holdExpiresAt = new Date(Date.now() + (settings.rewardHoldDays || 7) * 24 * 60 * 60 * 1000);

      const reward = await tx.referralReward.create({
        data: {
          referrerUserId: referredUser.referredByUserId,
          referredUserId: referredUser.id,
          qualifyingOrderId: orderId,
          status: ReferralStatus.PENDING,
          referrerCoins: settings.referrerRewardCoins,
          newCustomerCoins: settings.newCustomerRewardCoins,
          holdExpiresAt,
        },
      });

      await DomainEventService.publish({
        eventName: 'REFERRAL_QUALIFIED',
        userId: referredUser.referredByUserId,
        orderId,
        metadata: {
          referrerCoins: settings.referrerRewardCoins,
          holdExpiresAt,
        },
      });

      return reward;
    } catch (error) {
      console.error('[ReferralService evaluateQualifyingOrder Error]:', error);
    }
  }

  /**
   * Releases pending referral rewards whose hold period has expired
   */
  static async releasePendingReferralRewards() {
    try {
      const now = new Date();
      const pendingRewards = await db.referralReward.findMany({
        where: {
          status: ReferralStatus.PENDING,
          holdExpiresAt: { lte: now },
          flaggedForReview: false,
        },
      });

      for (const r of pendingRewards) {
        await db.$transaction(async (tx) => {
          // Grant referrer coins
          const referrerGrant = await LoyaltyService.grantCoinsTx(
            tx,
            r.referrerUserId,
            r.referrerCoins,
            'REFERRAL_REFERRER',
            `Hadiah referral pembeli pertama`,
            365
          );

          // Grant new customer welcome coins
          const welcomeGrant = await LoyaltyService.grantCoinsTx(
            tx,
            r.referredUserId,
            r.newCustomerCoins,
            'REFERRAL_WELCOME',
            `Bonus koin selamat datang dari referral`,
            365
          );

          await tx.referralReward.update({
            where: { id: r.id },
            data: {
              status: ReferralStatus.REWARDED,
              referrerCoinGrantId: referrerGrant?.id,
              newCustomerCoinGrantId: welcomeGrant?.id,
            },
          });
        });

        await DomainEventService.publish({
          eventName: 'REFERRAL_REWARDED',
          userId: r.referrerUserId,
          metadata: { coinsEarned: r.referrerCoins },
        });
      }
    } catch (error) {
      console.error('[ReferralService releasePendingReferralRewards Error]:', error);
    }
  }

  /**
   * Reverses referral reward upon qualifying order refund
   */
  static async reverseReferralReward(tx: any, orderId: string) {
    const reward = await tx.referralReward.findUnique({
      where: { qualifyingOrderId: orderId },
    });

    if (!reward) return;

    await tx.referralReward.update({
      where: { id: reward.id },
      data: { status: ReferralStatus.REVERSED },
    });

    if (reward.referrerCoinGrantId) {
      await LoyaltyService.reverseGrantTx(tx, reward.referrerCoinGrantId, `Order #${orderId} direfund`);
    }
    if (reward.newCustomerCoinGrantId) {
      await LoyaltyService.reverseGrantTx(tx, reward.newCustomerCoinGrantId, `Order #${orderId} direfund`);
    }
  }
}
