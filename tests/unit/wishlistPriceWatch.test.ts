import { describe, it, expect, vi } from 'vitest';
import { PriceWatchService } from '../../src/services/priceWatch.service';

vi.mock('../../src/services/notification.service', () => ({
  NotificationService: {
    sendCustomerNotification: vi.fn().mockResolvedValue({ id: 'notif-1' }),
  },
}));

vi.mock('../../src/lib/db/prisma', () => ({
  db: {
    productVariant: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'var-1',
        price: 80000,
        name: '1 Month Shared',
        product: { id: 'prod-1', name: 'Adobe Creative Cloud', slug: 'adobe-cc' },
      }),
    },
    priceWatch: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'w-1', userId: 'user-1', productVariantId: 'var-1', referencePrice: 100000, targetPrice: null, lastNotifiedPrice: null },
      ]),
      update: vi.fn().mockResolvedValue({ id: 'w-1', status: 'TRIGGERED' }),
    },
  },
}));

describe('Priority 4 — Wishlist & Price Watch Tests', () => {
  it('should trigger price drop notification when price drops by 20% (from 100k to 80k)', async () => {
    const res = await PriceWatchService.detectPriceDropsAndNotify('var-1', 100000, 80000, 5);

    expect(res.count).toBe(1);
    expect(res.dropPercentage).toBe(20);
  });

  it('should NOT trigger notification if price drop is less than minimum 5% threshold', async () => {
    const res = await PriceWatchService.detectPriceDropsAndNotify('var-1', 100000, 98000, 5);

    expect(res.count).toBe(0);
    expect(res.reason).toBe('BELOW_MIN_PERCENTAGE');
  });
});
