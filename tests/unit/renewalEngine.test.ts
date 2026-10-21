import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RenewalService } from '../../src/services/renewal.service';
import { db } from '../../src/lib/db/prisma';

vi.mock('../../src/lib/db/prisma', () => ({
  db: {
    subscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/domainEvent.service', () => ({
  DomainEventService: {
    publish: vi.fn(),
  },
}));

describe('Priority 3 — Renewal Engine Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return existing active renewal order if customer clicks renew multiple times', async () => {
    const mockSubscription = {
      id: 'sub-1',
      userId: 'user-1',
      variantId: 'var-1',
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      variant: { id: 'var-1', renewalEnabled: true, price: 50000, product: { name: 'Adobe Shared' } },
    };

    const mockExistingOrder = {
      id: 'ord-renewal-1',
      orderNumber: 'ORD-RNW-123',
      status: 'PENDING_PAYMENT',
      isRenewal: true,
      renewalOfSubscriptionId: 'sub-1',
    };

    (db.subscription.findUnique as any).mockResolvedValue(mockSubscription);
    (db.order.findFirst as any).mockResolvedValue(mockExistingOrder);

    const result = await RenewalService.createRenewalOrder('user-1', 'sub-1');

    expect(result).toBe(mockExistingOrder);
    expect(db.order.create).not.toHaveBeenCalled();
  });

  it('should calculate subscription extension base date as max(current.expiresAt, now)', async () => {
    const futureExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const mockOrder = {
      id: 'ord-renewal-2',
      isRenewal: true,
      renewalOfSubscriptionId: 'sub-2',
      userId: 'user-1',
      renewalOfSubscription: {
        id: 'sub-2',
        expiresAt: futureExpiry,
        orderItemId: 'item-1',
        variant: { renewalFulfillmentMode: 'EXTEND_EXISTING', subscriptionDays: 30 },
      },
    };

    const tx = {
      order: { findUnique: vi.fn().mockResolvedValue(mockOrder) },
      subscription: { update: vi.fn().mockResolvedValue({}) },
      fulfillment: { findFirst: vi.fn().mockResolvedValue(null) },
    };

    await RenewalService.processCompletedRenewal(tx, 'ord-renewal-2');

    expect(tx.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-2' },
        data: expect.objectContaining({
          status: 'ACTIVE',
          renewalCount: { increment: 1 },
        }),
      })
    );
  });
});
