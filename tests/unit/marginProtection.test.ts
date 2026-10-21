import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/lib/db/prisma';
import { PricingService } from '../../src/services/costEngine.service';

describe('Priority 2 — Margin Protection Engine Tests', { timeout: 30000 }, () => {
  let testVariant: any;

  beforeEach(async () => {
    await db.productVariant.deleteMany({ where: { sku: 'SKU-MARGIN-01' } });
    await db.product.deleteMany({ where: { slug: 'margin-test-product' } });

    const category = await db.category.upsert({
      where: { slug: 'margin-test-cat' },
      update: {},
      create: { name: 'Margin Test Cat', slug: 'margin-test-cat' },
    });

    const product = await db.product.create({
      data: {
        name: 'Margin Test Product',
        slug: 'margin-test-product',
        sku: 'PROD-MARGIN-01',
        shortDesc: 'Desc',
        fullDesc: 'Full desc',
        categoryId: category.id,
      },
    });

    testVariant = await db.productVariant.create({
      data: {
        productId: product.id,
        name: 'Margin Test Variant',
        sku: 'SKU-MARGIN-01',
        price: 100000,
        defaultCostAmount: 80000, // Rp80.000 cost
      },
    });

    await db.globalBusinessSettings.upsert({
      where: { id: 'default' },
      update: { marginProtectionEnabled: true, minimumMarginPercentage: 15.0 },
      create: { id: 'default', marginProtectionEnabled: true, minimumMarginPercentage: 15.0 },
    });
  });

  it('should calculate max allowed discount under minimum margin protection policy', async () => {
    const resAllowed = await PricingService.validateMarginProtection(testVariant.id, 100000, 5000);
    expect(resAllowed.minMarginPercentage).toBe(15.0);
    expect(resAllowed.allowed).toBe(true);

    const resBlocked = await PricingService.validateMarginProtection(testVariant.id, 100000, 10000);
    expect(resBlocked.allowed).toBe(false);
    expect(resBlocked.maxAllowedDiscount).toBeLessThan(10000);
  });
});
