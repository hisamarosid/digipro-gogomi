import { describe, it, expect, vi } from 'vitest';
import { quotaBarPercent } from '@/components/storefront/ServiceCard';
import { consumeServiceQuota } from '@/services/serviceQuota.service';
import { isServiceProduct, buildWhatsappLink } from '@/lib/utils/whatsapp';

vi.mock('@/lib/db/prisma', () => ({ db: {} }));

describe('quotaBarPercent', () => {
  it('shows how much of the capacity is still open', () => {
    expect(quotaBarPercent(5, 5)).toBe(50);
    expect(quotaBarPercent(2, 19)).toBe(10);
  });
  it('never shows an empty-looking bar while slots remain, and is 0 when full', () => {
    expect(quotaBarPercent(1, 500)).toBe(8);
    expect(quotaBarPercent(0, 10)).toBe(0);
  });
  it('is full when nothing was sold yet', () => {
    expect(quotaBarPercent(5, 0)).toBe(100);
  });
});

describe('consumeServiceQuota', () => {
  it('takes slots only from limited variants and clamps at zero', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    await consumeServiceQuota({ productVariant: { updateMany } } as any, 'v1', 2);
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'v1', quotaRemaining: { gt: 0 } },
      data: { quotaRemaining: { decrement: 2 } },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'v1', quotaRemaining: { lt: 0 } },
      data: { quotaRemaining: 0 },
    });
  });

  it('never throws, so a payment cannot fail because of it', async () => {
    const updateMany = vi.fn().mockRejectedValue(new Error('column does not exist'));
    await expect(consumeServiceQuota({ productVariant: { updateMany } } as any, 'v1', 1)).resolves.toBeUndefined();
  });
});

describe('service helpers', () => {
  it('treats only fully manual products as services', () => {
    expect(isServiceProduct([{ deliveryModel: 'MANUAL' }])).toBe(true);
    expect(isServiceProduct([{ deliveryModel: 'MANUAL' }, { deliveryModel: 'DEDICATED_ACCOUNT' }])).toBe(false);
    expect(isServiceProduct([])).toBe(false);
  });
  it('builds a wa.me link from a local or international number', () => {
    expect(buildWhatsappLink('0851-7875-4012', 'hi')).toBe('https://wa.me/6285178754012?text=hi');
    expect(buildWhatsappLink('+6285178754012', 'a b')).toBe('https://wa.me/6285178754012?text=a%20b');
    expect(buildWhatsappLink('', 'hi')).toBeNull();
  });
});
