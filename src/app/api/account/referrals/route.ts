import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedCustomer, handleAuthError } from '@/lib/auth/session';
import { ReferralService } from '@/services/referral.service';
import { FeatureFlagService } from '@/services/featureFlag.service';
import { db } from '@/lib/db/prisma';
import { ReferralStatus } from '../../../../../generated/prisma';

export async function GET(req: NextRequest) {
  try {
    if (!(await FeatureFlagService.isEnabled('REFERRAL'))) {
      return NextResponse.json({ success: false, error: 'FEATURE_DISABLED' }, { status: 403 });
    }

    const session = await requireVerifiedCustomer();
    const code = await ReferralService.getOrCreateUserReferralCode(session.userId);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const referralLink = `${baseUrl}/r/${code}`;

    const rewards = await db.referralReward.findMany({
      where: { referrerUserId: session.userId },
      include: {
        referred: { select: { email: true, name: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const successfulReferrals = rewards.filter((r) => r.status === ReferralStatus.REWARDED).length;
    const pendingReferrals = rewards.filter((r) => r.status === ReferralStatus.PENDING || r.status === ReferralStatus.QUALIFIED).length;
    const coinsEarned = rewards
      .filter((r) => r.status === ReferralStatus.REWARDED)
      .reduce((sum, r) => sum + (r.referrerCoins || 0), 0);

    const maskedHistory = rewards.map((r) => {
      const emailParts = r.referred.email.split('@');
      const maskedEmail = `${emailParts[0][0]}***@${emailParts[1] || 'domain.com'}`;
      return {
        id: r.id,
        referredEmail: maskedEmail,
        status: r.status,
        createdAt: r.createdAt,
        referrerCoins: r.referrerCoins,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        referralCode: code,
        referralLink,
        successfulReferrals,
        pendingReferrals,
        coinsEarned,
        rewards: maskedHistory,
      },
    });
  } catch (err: any) {
    return handleAuthError(err);
  }
}
