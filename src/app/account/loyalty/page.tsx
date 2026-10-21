import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { LoyaltyTierService } from '@/services/loyaltyTier.service';
import { MilestoneService } from '@/services/milestone.service';
import { CustomerLoyaltyClient } from './CustomerLoyaltyClient';

export const dynamic = 'force-dynamic';

export default async function CustomerLoyaltyPage() {
  const session = await requireAuth();

  const [loyaltyData, milestones] = await Promise.all([
    LoyaltyTierService.getUserLoyaltyStatus(session.userId),
    MilestoneService.getUserMilestones(session.userId),
  ]);

  return <CustomerLoyaltyClient loyaltyData={loyaltyData} milestones={milestones} />;
}

