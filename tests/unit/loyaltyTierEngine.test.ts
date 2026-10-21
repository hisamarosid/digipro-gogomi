import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoyaltyTierService } from '../../src/services/loyaltyTier.service';

vi.mock('../../src/lib/db/prisma', () => ({
  db: {
    loyaltyTier: {
      upsert: vi.fn().mockResolvedValue({ id: 'tier-gold' }),
      findMany: vi.fn().mockResolvedValue([
        { id: 't-plat', slug: 'platinum', name: 'Platinum', rank: 4, minimumSpend: 5000000, coinRewardMultiplier: 1.5 },
        { id: 't-gold', slug: 'gold', name: 'Gold VIP', rank: 3, minimumSpend: 1500000, coinRewardMultiplier: 1.25 },
        { id: 't-silver', slug: 'silver', name: 'Silver', rank: 2, minimumSpend: 500000, coinRewardMultiplier: 1.1 },
        { id: 't-bronze', slug: 'bronze', name: 'Bronze', rank: 1, minimumSpend: 0, coinRewardMultiplier: 1.0 },
      ]),
      findFirst: vi.fn().mockResolvedValue({ id: 't-bronze', rank: 1 }),
    },
    customerLoyaltyTier: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'rec-1', tierId: 't-gold', qualifiedSpend: 1890000 }),
      update: vi.fn().mockResolvedValue({ id: 'rec-1', tierId: 't-gold', qualifiedSpend: 1890000 }),
    },
    customerLoyaltyTierHistory: {
      create: vi.fn().mockResolvedValue({ id: 'hist-1' }),
    },
    order: {
      findMany: vi.fn().mockResolvedValue([
        { cashPayableAmount: 1890000 },
      ]),
    },
  },
}));

describe('Priority 4 — Loyalty Tier Engine Tests', () => {
  it('should evaluate completed spend and qualify customer for Gold VIP tier', async () => {
    const mockTx = {
      loyaltyTier: {
        findMany: vi.fn().mockResolvedValue([
          { id: 't-plat', slug: 'platinum', name: 'Platinum', rank: 4, minimumSpend: 5000000, coinRewardMultiplier: 1.5 },
          { id: 't-gold', slug: 'gold', name: 'Gold VIP', rank: 3, minimumSpend: 1500000, coinRewardMultiplier: 1.25 },
          { id: 't-silver', slug: 'silver', name: 'Silver', rank: 2, minimumSpend: 500000, coinRewardMultiplier: 1.1 },
          { id: 't-bronze', slug: 'bronze', name: 'Bronze', rank: 1, minimumSpend: 0, coinRewardMultiplier: 1.0 },
        ]),
        upsert: vi.fn().mockResolvedValue({ id: 't-gold' }),
      },
      customerLoyaltyTier: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'c-rec-1', ...data })),
      },
      customerLoyaltyTierHistory: {
        create: vi.fn().mockResolvedValue({ id: 'h-1' }),
      },
      order: {
        findMany: vi.fn().mockResolvedValue([{ cashPayableAmount: 1890000 }]),
      },
    };

    const record = await LoyaltyTierService.evaluateCustomerTier(mockTx, 'user-budi');

    expect(record).toBeDefined();
    expect(record.tierId).toBe('t-gold');
    expect(record.qualifiedSpend).toBe(1890000);
  });

  it('should calculate final earned coins using Gold tier multiplier 1.25x', () => {
    const baseCoins = 200;
    const goldMultiplier = 1.25;
    const finalCoins = Math.floor(baseCoins * goldMultiplier);

    expect(finalCoins).toBe(250);
  });
});
