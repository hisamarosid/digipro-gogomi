import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReferralService } from '../../src/services/referral.service';
import { db } from '../../src/lib/db/prisma';

vi.mock('../../src/lib/db/prisma', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    referralProgramSettings: {
      findUnique: vi.fn(),
    },
    referralReward: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/loyalty.service', () => ({
  LoyaltyService: {
    grantCoinsTx: vi.fn(),
    reverseGrantTx: vi.fn(),
  },
}));

vi.mock('../../src/services/domainEvent.service', () => ({
  DomainEventService: {
    publish: vi.fn(),
  },
}));

describe('Priority 3 — Referral System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a unique uppercase referral code for user', async () => {
    (db.user.findUnique as any).mockResolvedValue({ referralCode: null, name: 'Fadli Developer' });
    (db.user.update as any).mockResolvedValue({ referralCode: 'FADL1234' });

    const code = await ReferralService.getOrCreateUserReferralCode('user-1');

    expect(code).toBeDefined();
    expect(code.length).toBeGreaterThanOrEqual(6);
  });

  it('should block self-referral qualification', async () => {
    const mockOrder = {
      id: 'ord-1',
      userId: 'user-1',
      cashPayableAmount: 100000,
      user: { id: 'user-1', referredByUserId: 'user-1' }, // Self referral
    };

    const tx = {
      order: { findUnique: vi.fn().mockResolvedValue(mockOrder) },
      referralProgramSettings: { findUnique: vi.fn().mockResolvedValue({ enabled: true, minimumCashPurchaseAmount: 50000 }) },
      referralReward: { findFirst: vi.fn(), create: vi.fn() },
    };

    await ReferralService.evaluateQualifyingOrder(tx, 'ord-1');

    expect(tx.referralReward.create).not.toHaveBeenCalled();
  });

  it('should evaluate qualifying order and create ReferralReward in PENDING state with hold duration', async () => {
    const mockOrder = {
      id: 'ord-qualifying',
      userId: 'user-new',
      cashPayableAmount: 75000,
      user: { id: 'user-new', referredByUserId: 'user-referrer' },
    };

    const tx = {
      order: { findUnique: vi.fn().mockResolvedValue(mockOrder) },
      referralProgramSettings: {
        findUnique: vi.fn().mockResolvedValue({
          enabled: true,
          minimumCashPurchaseAmount: 50000,
          referrerRewardCoins: 500,
          newCustomerRewardCoins: 200,
          rewardHoldDays: 7,
        }),
      },
      referralReward: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'ref-reward-1', status: 'PENDING' }),
      },
    };

    await ReferralService.evaluateQualifyingOrder(tx, 'ord-qualifying');

    expect(tx.referralReward.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referrerUserId: 'user-referrer',
          referredUserId: 'user-new',
          status: 'PENDING',
          referrerCoins: 500,
          newCustomerCoins: 200,
        }),
      })
    );
  });
});
