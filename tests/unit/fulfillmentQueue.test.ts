import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/lib/db/prisma';
import { FulfillmentQueueService } from '../../src/services/queue.service';
import {
  DeliveryModel,
  FulfillmentJobStatus,
  JobPriority,
  OrderStatus,
  PaymentStatus,
} from '../../generated/prisma';

describe('Priority 1 — Fulfillment Queue & Retry Engine Tests', { timeout: 30000 }, () => {
  let testProduct: any;
  let testVariant: any;
  let testOrder: any;

  beforeEach(async () => {
    // Clean up test queue & order data
    await db.fulfillmentAttempt.deleteMany({ where: { job: { order: { orderNumber: { startsWith: 'ORD-QTEST-' } } } } });
    await db.fulfillmentJob.deleteMany({ where: { order: { orderNumber: { startsWith: 'ORD-QTEST-' } } } });
    await db.fulfillment.deleteMany({ where: { orderItem: { order: { orderNumber: { startsWith: 'ORD-QTEST-' } } } } });
    await db.orderItem.deleteMany({ where: { order: { orderNumber: { startsWith: 'ORD-QTEST-' } } } });
    await db.order.deleteMany({ where: { orderNumber: { startsWith: 'ORD-QTEST-' } } });
    await db.productVariant.deleteMany({ where: { sku: 'SKU-QTEST-01' } });
    await db.product.deleteMany({ where: { sku: 'PROD-QTEST-01' } });

    const category = await db.category.upsert({
      where: { slug: 'queue-test-cat' },
      update: {},
      create: { name: 'Queue Test Cat', slug: 'queue-test-cat' },
    });

    testProduct = await db.product.create({
      data: {
        name: 'Queue Test Product',
        slug: 'queue-test-product',
        sku: 'PROD-QTEST-01',
        shortDesc: 'Desc',
        fullDesc: 'Full desc',
        categoryId: category.id,
      },
    });

    testVariant = await db.productVariant.create({
      data: {
        productId: testProduct.id,
        name: 'Queue Test Variant',
        sku: 'SKU-QTEST-01',
        price: 50000,
        deliveryModel: DeliveryModel.DEDICATED_ACCOUNT,
      },
    });
  });

  it('should enqueue job idempotently without creating duplicate active jobs', async () => {
    const orderNumber = `ORD-QTEST-${Date.now()}`;
    testOrder = await db.order.create({
      data: {
        orderNumber,
        totalAmount: 50000,
        grandTotal: 50000,
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        items: {
          create: {
            variantId: testVariant.id,
            productName: testProduct.name,
            variantName: testVariant.name,
            sku: testVariant.sku,
            unitPrice: 50000,
            quantity: 1,
            subtotal: 50000,
            deliveryType: 'ACCOUNT',
            deliveryModelSnapshot: DeliveryModel.DEDICATED_ACCOUNT,
          },
        },
      },
      include: { items: true },
    });

    const item = testOrder.items[0];

    const job1 = await db.$transaction(async (tx) => {
      return await FulfillmentQueueService.enqueueJob(tx, testOrder.id, item.id, DeliveryModel.DEDICATED_ACCOUNT);
    });

    const job2 = await db.$transaction(async (tx) => {
      return await FulfillmentQueueService.enqueueJob(tx, testOrder.id, item.id, DeliveryModel.DEDICATED_ACCOUNT);
    });

    expect(job1.id).toBe(job2.id);

    const count = await db.fulfillmentJob.count({
      where: { orderItemId: item.id },
    });
    expect(count).toBe(1);
  });

  it('should transition job to WAITING_STOCK when no inventory is available', async () => {
    const orderNumber = `ORD-QTEST-${Date.now()}-2`;
    testOrder = await db.order.create({
      data: {
        orderNumber,
        totalAmount: 50000,
        grandTotal: 50000,
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        items: {
          create: {
            variantId: testVariant.id,
            productName: testProduct.name,
            variantName: testVariant.name,
            sku: testVariant.sku,
            unitPrice: 50000,
            quantity: 1,
            subtotal: 50000,
            deliveryType: 'ACCOUNT',
            deliveryModelSnapshot: DeliveryModel.DEDICATED_ACCOUNT,
          },
        },
      },
      include: { items: true },
    });

    const item = testOrder.items[0];

    const job = await db.$transaction(async (tx) => {
      return await FulfillmentQueueService.enqueueJob(tx, testOrder.id, item.id, DeliveryModel.DEDICATED_ACCOUNT);
    });

    const execRes = await FulfillmentQueueService.executeJob(job.id);
    expect(execRes.success).toBe(false);

    const updatedJob = await db.fulfillmentJob.findUnique({
      where: { id: job.id },
      include: { attempts: true },
    });

    expect(updatedJob?.status).toBe(FulfillmentJobStatus.WAITING_STOCK);
    expect(updatedJob?.attempts.length).toBe(1);
    expect(updatedJob?.lastErrorCode).toBe('NO_AVAILABLE_INVENTORY');
  });
});
