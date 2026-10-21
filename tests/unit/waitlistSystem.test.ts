import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WaitlistService } from '../../src/services/waitlist.service';
import { db } from '../../src/lib/db/prisma';

vi.mock('../../src/lib/db/prisma', () => ({
  db: {
    productVariant: {
      findUnique: vi.fn(),
    },
    inventoryItem: {
      count: vi.fn(),
    },
    sharedAccountSlot: {
      count: vi.fn(),
    },
    familyMemberSlot: {
      count: vi.fn(),
    },
    productWaitlist: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/domainEvent.service', () => ({
  DomainEventService: {
    publish: vi.fn(),
  },
}));

describe('Priority 3 — Waitlist & Restock System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate eligible stock accurately and throw if stock is available when joining waitlist', async () => {
    (db.productVariant.findUnique as any).mockResolvedValue({
      id: 'var-1',
      active: true,
      deliveryModel: 'DEDICATED_ACCOUNT',
    });
    (db.inventoryItem.count as any).mockResolvedValue(5); // Stock is 5

    await expect(WaitlistService.joinWaitlist('user-1', 'user@example.com', 'var-1')).rejects.toThrow(
      'STOCK_IS_AVAILABLE'
    );
  });

  it('should allow joining waitlist when eligible stock is 0', async () => {
    (db.productVariant.findUnique as any).mockResolvedValue({
      id: 'var-1',
      productId: 'prod-1',
      active: true,
      deliveryModel: 'DEDICATED_ACCOUNT',
    });
    (db.inventoryItem.count as any).mockResolvedValue(0); // Stock is 0
    (db.productWaitlist.findFirst as any).mockResolvedValue(null);
    (db.productWaitlist.create as any).mockResolvedValue({
      id: 'wl-1',
      email: 'user@example.com',
      status: 'ACTIVE',
    });

    const entry = await WaitlistService.joinWaitlist('user-1', 'user@example.com', 'var-1');

    expect(entry.status).toBe('ACTIVE');
    expect(db.productWaitlist.create).toHaveBeenCalled();
  });
});
