import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { ReferralStatus } from '../../../../../generated/prisma';
import { LoyaltyService } from '@/services/loyalty.service';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const rewards = await db.referralReward.findMany({
      include: {
        referrer: { select: { name: true, email: true, referralCode: true } },
        referred: { select: { name: true, email: true, createdAt: true } },
        riskFlags: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalRegistrations = await db.user.count({
      where: { referredByUserId: { not: null } },
    });

    const qualifiedCount = rewards.filter((r) => r.status === ReferralStatus.QUALIFIED || r.status === ReferralStatus.REWARDED).length;
    const pendingCount = rewards.filter((r) => r.status === ReferralStatus.PENDING).length;
    const totalCoinsIssued = rewards
      .filter((r) => r.status === ReferralStatus.REWARDED)
      .reduce((sum, r) => sum + r.referrerCoins + r.newCustomerCoins, 0);

    const conversionRatePct =
      totalRegistrations > 0 ? ((qualifiedCount / totalRegistrations) * 100).toFixed(1) : '0.0';

    return NextResponse.json({
      success: true,
      data: {
        totalRegistrations,
        qualifiedCount,
        pendingCount,
        totalCoinsIssued,
        conversionRatePct,
        rewards,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { rewardId, action, reason } = body;

    if (!rewardId || !action) {
      return NextResponse.json({ success: false, error: 'Reward ID dan Action wajib diisi' }, { status: 400 });
    }

    const reward = await db.referralReward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      return NextResponse.json({ success: false, error: 'Referral reward tidak ditemukan' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      await db.$transaction(async (tx) => {
        const referrerGrant = await LoyaltyService.grantCoinsTx(
          tx,
          reward.referrerUserId,
          reward.referrerCoins,
          'REFERRAL_REFERRER',
          `Hadiah referral disetujui admin`,
          365
        );

        const welcomeGrant = await LoyaltyService.grantCoinsTx(
          tx,
          reward.referredUserId,
          reward.newCustomerCoins,
          'REFERRAL_WELCOME',
          `Bonus koin selamat datang disetujui admin`,
          365
        );

        await tx.referralReward.update({
          where: { id: rewardId },
          data: {
            status: ReferralStatus.REWARDED,
            flaggedForReview: false,
            reviewedAt: new Date(),
            reviewedBy: session.userId,
            referrerCoinGrantId: referrerGrant?.id,
            newCustomerCoinGrantId: welcomeGrant?.id,
          },
        });
      });

      return NextResponse.json({ success: true, message: 'Referral reward berhasil disetujui dan koin dicairkan!' });
    } else if (action === 'REJECT') {
      await db.referralReward.update({
        where: { id: rewardId },
        data: {
          status: ReferralStatus.REJECTED,
          flaggedForReview: false,
          flagReason: reason || 'Ditolak oleh admin',
          reviewedAt: new Date(),
          reviewedBy: session.userId,
        },
      });

      return NextResponse.json({ success: true, message: 'Referral reward berhasil ditolak' });
    }

    return NextResponse.json({ success: false, error: 'Action tidak valid' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
