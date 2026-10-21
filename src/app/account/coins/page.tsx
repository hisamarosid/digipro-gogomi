import React from 'react';
import { getCurrentSession } from '@/lib/auth/session';
import { LoyaltyService } from '@/services/loyalty.service';
import { db } from '@/lib/db/prisma';
import { AccountCoinsClient } from '@/app/account/coins/AccountCoinsClient';

export const dynamic = 'force-dynamic';

export default async function AccountCoinsPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const [balance, history] = await Promise.all([
    LoyaltyService.getCoinSummary(session.userId),
    LoyaltyService.getCoinHistory(session.userId, { take: 50 }),
  ]);

  return <AccountCoinsClient balance={balance} initialHistory={history} />;
}
