import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/lib/db/prisma';
import { FulfillmentDiagnosticService, DIAGNOSTIC_CODES } from '../../src/services/diagnostic.service';
import { ErrorCategory, SharedAccountStatus, SharedSlotStatus } from '../../generated/prisma';

describe('Priority 1 — Fulfillment Diagnostic System Tests', { timeout: 30000 }, () => {
  let testVariant: any;
  let testAccount: any;

  beforeEach(async () => {
    await db.sharedAccountSlot.deleteMany({ where: { sharedAccount: { label: 'ADB-DIAG-01' } } });
    await db.sharedAccount.deleteMany({ where: { label: 'ADB-DIAG-01' } });
    await db.productVariant.deleteMany({ where: { sku: 'SKU-DIAG-01' } });
    await db.product.deleteMany({ where: { slug: 'diag-test-product' } });

    const category = await db.category.upsert({
      where: { slug: 'diag-test-cat' },
      update: {},
      create: { name: 'Diag Test Cat', slug: 'diag-test-cat' },
    });

    const product = await db.product.create({
      data: {
        name: 'Diag Test Product',
        slug: 'diag-test-product',
        sku: 'PROD-DIAG-01',
        shortDesc: 'Desc',
        fullDesc: 'Full desc',
        categoryId: category.id,
      },
    });

    testVariant = await db.productVariant.create({
      data: {
        productId: product.id,
        name: 'Diag Test Shared Variant',
        sku: 'SKU-DIAG-01',
        price: 90000,
        warrantyDays: 30,
        deliveryModel: 'SHARED_ACCOUNT',
      },
    });
  });

  it('should diagnose MASTER_LIFETIME_INSUFFICIENT when master account expires before package warranty', async () => {
    const now = new Date();
    const masterExpiresAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days left, but variant requires 30 days

    testAccount = await db.sharedAccount.create({
      data: {
        productVariantId: testVariant.id,
        label: 'ADB-DIAG-01',
        credentialEncrypted: 'enc_diag_credential',
        maxSlots: 2,
        status: SharedAccountStatus.AVAILABLE,
        masterExpiresAt,
        slots: {
          create: [{ slotNumber: 1, slotLabel: 'USER 1', status: SharedSlotStatus.AVAILABLE }],
        },
      },
    });

    const diag = await FulfillmentDiagnosticService.diagnoseVariantFulfillment(testVariant.id);
    expect(diag.success).toBe(false);
    expect(diag.code).toBe(DIAGNOSTIC_CODES.MASTER_LIFETIME_INSUFFICIENT);
    expect(diag.category).toBe(ErrorCategory.WAITING_RESOURCE);
    expect(diag.rejectedCandidates?.length).toBe(1);
    expect(diag.rejectedCandidates?.[0].reasonCode).toBe(DIAGNOSTIC_CODES.MASTER_LIFETIME_INSUFFICIENT);
  });
});
