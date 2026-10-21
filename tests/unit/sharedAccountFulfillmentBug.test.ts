import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/lib/db/prisma';
import { FulfillmentService } from '../../src/services/fulfillment.service';
import { SharedStockService } from '../../src/services/sharedStock.service';
import { SharedAccountService } from '../../src/services/sharedAccount.service';
import {
  DeliveryModel,
  OrderStatus,
  PaymentStatus,
  SharedAccountStatus,
  SharedSlotStatus,
  FulfillmentStatus,
} from '../../generated/prisma';

describe('SHARED_ACCOUNT Fulfillment Engine & Bug Resolution Tests', { timeout: 30000 }, () => {
  let testProduct: any;
  let testVariantShared: any;
  let testVariantOther: any;

  beforeEach(async () => {
    // Clean up test data safely without wiping dev seed data
    await db.fulfillment.deleteMany({ where: { orderItem: { order: { orderNumber: { startsWith: 'ORD-TEST-' } } } } });
    await db.orderItem.deleteMany({ where: { order: { orderNumber: { startsWith: 'ORD-TEST-' } } } });
    await db.order.deleteMany({ where: { orderNumber: { startsWith: 'ORD-TEST-' } } });
    await db.sharedAccount.deleteMany({ where: { label: { startsWith: 'ADB00' } } });
    await db.productVariant.deleteMany({ where: { sku: { startsWith: 'ADB-SHARED-' } } });
    await db.product.deleteMany({ where: { slug: 'adobe-creative-cloud-test' } });
    await db.product.deleteMany({ where: { sku: 'TEST-ADB-01' } });

    const category = await db.category.upsert({
      where: { slug: 'design-test' },
      update: {},
      create: { name: 'Design Test', slug: 'design-test' },
    });

    // Create test Adobe product safely with upsert
    testProduct = await db.product.upsert({
      where: { slug: 'adobe-creative-cloud-test' },
      update: {
        name: 'Adobe Creative Cloud Test',
        sku: 'TEST-ADB-01',
        shortDesc: 'Test desc',
        fullDesc: 'Test full desc',
        categoryId: category.id,
      },
      create: {
        name: 'Adobe Creative Cloud Test',
        slug: 'adobe-creative-cloud-test',
        sku: 'TEST-ADB-01',
        shortDesc: 'Test desc',
        fullDesc: 'Test full desc',
        categoryId: category.id,
      },
    });

    // Create test variant with deliveryModel = SHARED_ACCOUNT
    testVariantShared = await db.productVariant.create({
      data: {
        productId: testProduct.id,
        name: 'Shared 1B',
        sku: 'ADB-SHARED-1B-TEST',
        price: 99000,
        deliveryModel: DeliveryModel.SHARED_ACCOUNT,
        subscriptionDays: 30,
        warrantyDays: 30,
        sharedCapacityDefault: 2,
        sharedSafetyBufferDays: 2,
        sharedRequireMasterLifetimeCheck: true,
      },
    });

    // Create a sibling variant for variant mismatch test
    testVariantOther = await db.productVariant.create({
      data: {
        productId: testProduct.id,
        name: 'Shared 3B',
        sku: 'ADB-SHARED-3B-TEST',
        price: 250000,
        deliveryModel: DeliveryModel.SHARED_ACCOUNT,
        subscriptionDays: 90,
        warrantyDays: 90,
      },
    });
  });

  it('MUST succeed and fulfill order when valid SharedAccount and slots exist (REQUIRED BUG REPRODUCTION & FIX)', async () => {
    // 1. Create valid SharedAccount ADB001 linked to testVariantShared with 2 AVAILABLE slots
    const now = new Date();
    const masterExpiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days remaining

    const sharedAccount = await SharedAccountService.createSharedAccount({
      productVariantId: testVariantShared.id,
      label: 'ADB001',
      credentialPlain: 'master_adobe@gogomi.store | Pass123!',
      maxSlots: 2,
      masterExpiresAt,
    });

    expect(sharedAccount).not.toBeNull();
    expect(sharedAccount!.slots.length).toBe(2);
    expect(sharedAccount!.slots[0].status).toBe(SharedSlotStatus.AVAILABLE);

    // 2. Create Order in PAID status for testVariantShared
    const order = await db.order.create({
      data: {
        orderNumber: 'ORD-TEST-ADB-001',
        guestEmail: 'customer@example.com',
        guestName: 'Budi Santoso',
        totalAmount: 99000,
        grandTotal: 99000,
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        items: {
          create: [
            {
              variantId: testVariantShared.id,
              productName: testProduct.name,
              variantName: testVariantShared.name,
              sku: testVariantShared.sku,
              unitPrice: 99000,
              quantity: 1,
              subtotal: 99000,
              deliveryType: 'ACCOUNT',
              deliveryModelSnapshot: DeliveryModel.SHARED_ACCOUNT,
            },
          ],
        },
      },
      include: { items: true },
    });

    // 3. Execute fulfillment
    const fulfillmentResult = await FulfillmentService.fulfillOrder(order.id);

    // 4. Assertions
    expect(fulfillmentResult.success).toBe(true);
    expect(fulfillmentResult.outOfStockItems).toHaveLength(0);

    const updatedOrder = await db.order.findUnique({
      where: { id: order.id },
      include: { items: { include: { fulfillments: true } } },
    });

    expect(updatedOrder?.status).toBe(OrderStatus.COMPLETED);
    expect(updatedOrder?.items[0].fulfillments).toHaveLength(1);
    expect(updatedOrder?.items[0].fulfillments[0].status).toBe(FulfillmentStatus.ACTIVE);
    expect(updatedOrder?.items[0].fulfillments[0].payloadRevealed).toContain('Slot 1');

    // Verify slot status updated to ASSIGNED
    const updatedSlot = await db.sharedAccountSlot.findUnique({
      where: { id: sharedAccount!.slots[0].id },
    });
    expect(updatedSlot?.status).toBe(SharedSlotStatus.ASSIGNED);
  });

  it('should detect VARIANT_MISMATCH when Shared Account belongs to a different variant', async () => {
    // Create Shared Account linked to testVariantOther (Shared 3B)
    await SharedAccountService.createSharedAccount({
      productVariantId: testVariantOther.id,
      label: 'ADB002',
      credentialPlain: 'master_other@gogomi.store | Pass123!',
      maxSlots: 2,
    });

    // Run diagnostic for testVariantShared (Shared 1B)
    const diag = await SharedStockService.getSharedInventoryDiagnostics(testVariantShared.id);

    expect(diag.eligibleSlots).toBe(0);
    expect(diag.primaryFailureReason).toBe('VARIANT_MISMATCH');
  });

  it('should reject candidate account if master remaining lifetime is insufficient', async () => {
    const now = new Date();
    const masterExpiresAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days remaining < 32 required

    await SharedAccountService.createSharedAccount({
      productVariantId: testVariantShared.id,
      label: 'ADB003',
      credentialPlain: 'master_short_life@gogomi.store | Pass123!',
      maxSlots: 2,
      masterExpiresAt,
    });

    const diag = await SharedStockService.getSharedInventoryDiagnostics(testVariantShared.id);

    expect(diag.eligibleSlots).toBe(0);
    expect(diag.candidates[0].eligible).toBe(false);
    expect(diag.candidates[0].rejectionReason).toBe('MASTER_LIFETIME_INSUFFICIENT');
  });

  it('should allow partially-used shared account with available slots to accept new customers', async () => {
    const now = new Date();
    const masterExpiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const sharedAccount = await SharedAccountService.createSharedAccount({
      productVariantId: testVariantShared.id,
      label: 'ADB004',
      credentialPlain: 'master_partial@gogomi.store | Pass123!',
      maxSlots: 2,
      masterExpiresAt,
    });

    expect(sharedAccount).not.toBeNull();

    // Mark slot 1 ASSIGNED manually
    await db.sharedAccountSlot.update({
      where: { id: sharedAccount!.slots[0].id },
      data: { status: SharedSlotStatus.ASSIGNED },
    });
    await db.sharedAccount.update({
      where: { id: sharedAccount!.id },
      data: { status: SharedAccountStatus.PARTIALLY_USED },
    });

    // Create Order
    const order = await db.order.create({
      data: {
        orderNumber: 'ORD-TEST-PARTIAL-01',
        guestEmail: 'customer2@example.com',
        totalAmount: 99000,
        grandTotal: 99000,
        status: OrderStatus.PAID,
        items: {
          create: [
            {
              variantId: testVariantShared.id,
              productName: testProduct.name,
              variantName: testVariantShared.name,
              sku: testVariantShared.sku,
              unitPrice: 99000,
              quantity: 1,
              subtotal: 99000,
              deliveryType: 'ACCOUNT',
              deliveryModelSnapshot: DeliveryModel.SHARED_ACCOUNT,
            },
          ],
        },
      },
    });

    const res = await FulfillmentService.fulfillOrder(order.id);
    expect(res.success).toBe(true);

    // Verify slot 2 was assigned
    const slot2 = await db.sharedAccountSlot.findUnique({
      where: { id: sharedAccount!.slots[1].id },
    });
    expect(slot2?.status).toBe(SharedSlotStatus.ASSIGNED);
  });

  it('should handle retry fulfillment idempotently without duplicate slot assignment', async () => {
    const now = new Date();
    const masterExpiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const sharedAccount = await SharedAccountService.createSharedAccount({
      productVariantId: testVariantShared.id,
      label: 'ADB005',
      credentialPlain: 'master_retry@gogomi.store | Pass123!',
      maxSlots: 2,
      masterExpiresAt,
    });

    const order = await db.order.create({
      data: {
        orderNumber: 'ORD-TEST-RETRY-01',
        guestEmail: 'customer3@example.com',
        totalAmount: 99000,
        grandTotal: 99000,
        status: OrderStatus.PAID,
        items: {
          create: [
            {
              variantId: testVariantShared.id,
              productName: testProduct.name,
              variantName: testVariantShared.name,
              sku: testVariantShared.sku,
              unitPrice: 99000,
              quantity: 1,
              subtotal: 99000,
              deliveryType: 'ACCOUNT',
              deliveryModelSnapshot: DeliveryModel.SHARED_ACCOUNT,
            },
          ],
        },
      },
    });

    // First fulfillment
    const res1 = await FulfillmentService.fulfillOrder(order.id);
    expect(res1.success).toBe(true);

    // Second (retry) fulfillment call
    const res2 = await FulfillmentService.fulfillOrder(order.id);
    expect(res2.success).toBe(true);

    // Check total fulfillments created for order item
    const count = await db.fulfillment.count({
      where: { orderItem: { orderId: order.id } },
    });
    expect(count).toBe(1);
  });
});
