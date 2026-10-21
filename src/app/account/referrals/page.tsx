import { requireAuth } from '@/lib/auth/session';
import { ReferralService } from '@/services/referral.service';
import { db } from '@/lib/db/prisma';
import { ReferralStatus } from '../../../../generated/prisma';
import { CustomerReferralsClient } from './CustomerReferralsClient';

export default async function CustomerReferralsPage() {
  const session = await requireAuth();

  const [code, rewards] = await Promise.all([
    ReferralService.getOrCreateUserReferralCode(session.userId),
    db.referralReward.findMany({
      where: { referrerUserId: session.userId },
      include: {
        referred: { select: { email: true, name: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const referralLink = `${baseUrl}/r/${code}`;

  const successfulReferrals = rewards.filter((r) => r.status === ReferralStatus.REWARDED).length;
  const pendingReferrals = rewards.filter((r) => r.status === ReferralStatus.PENDING || r.status === ReferralStatus.QUALIFIED).length;
  const coinsEarned = rewards
    .filter((r) => r.status === ReferralStatus.REWARDED)
    .reduce((sum, r) => sum + (r.referrerCoins || 0), 0);

  const maskedHistory = rewards.map((r) => {
    const emailParts = (r.referred?.email || 'user@gogomi.store').split('@');
    const maskedEmail = `${emailParts[0][0]}***@${emailParts[1] || 'domain.com'}`;
    return {
      id: r.id,
      referredEmail: maskedEmail,
      status: r.status,
      createdAt: r.createdAt,
      referrerCoins: r.referrerCoins,
    };
  });

  return (
    <CustomerReferralsClient
      referralCode={code}
      referralLink={referralLink}
      successfulReferrals={successfulReferrals}
      pendingReferrals={pendingReferrals}
      coinsEarned={coinsEarned}
      rewards={maskedHistory}
    />
  );
}
