import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/lib/db/prisma';
import { CostEngineService } from '../../src/services/costEngine.service';
import { CostAllocationMode, DeliveryModel, OrderStatus, PaymentStatus } from '../../generated/prisma';

describe('Priority 2 — Cost Engine & Financial Snapshot Tests', { timeout: 30000 }, () => {
  let testVariant: any;
  let testAccount: any;
  let testSlot: any;
  let testOrder: any;

  beforeEach(async () => {
    await db.orderFinancialSnapshot.deleteMany({ where: { order: { orderNumber: { startsWith: 'ORD-COSTTEST-' } } } });
    await db.orderItem.deleteMany({ where: { order: { orderNumber: { startsWith: 'ORD-COSTTEST-' } } } });
    await db.order.deleteMany({ where: { orderNumber: { startsWith: 'ORD-COSTTEST-' } } });
    await db.sharedAccountSlot.deleteMany({ where: { sharedAccount: { label: 'ADB-COSTTEST-01' } } });
    await db.sharedAccount.deleteMany({ where: { label: 'ADB-COSTTEST-01' } });
    await db.productVariant.deleteMany({ where: { sku: 'SKU-COSTTEST-01' } });
    await db.product.deleteMany({ where: { slug: 'cost-test-product' } });

    const category = await db.category.upsert({
      where: { slug: 'cost-test-cat' },
      update: {},
      create: { name: 'Cost Test Cat', slug: 'cost-test-cat' },
    });

    const product = await db.product.create({
      data: {
        name: 'Cost Test Product',
        slug: 'cost-test-product',
        sku: 'PROD-COSTTEST-01',
        shortDesc: 'Desc',
        fullDesc: 'Full desc',
        categoryId: category.id,
      },
    });

    testVariant = await db.productVariant.create({
      data: {
        productId: product.id,
        name: 'Cost Test Shared Variant',
        sku: 'SKU-COSTTEST-01',
        price: 100000,
        defaultCostAmount: 40000,
        deliveryModel: DeliveryModel.SHARED_ACCOUNT,
      },
    });

    testAccount = await db.sharedAccount.create({
      data: {
        productVariantId: testVariant.id,
        label: 'ADB-COSTTEST-01',
        credentialEncrypted: 'enc_cost_credential',
        maxSlots: 2,
        acquisitionCost: 100000, // Rp100.000 total master cost
        costAllocationMode: CostAllocationMode.EQUAL_PER_SLOT, // Rp50.000 / slot
      },
    });

    testSlot = await db.sharedAccountSlot.create({
      data: {
        sharedAccountId: testAccount.id,
        slotNumber: 1,
        slotLabel: 'USER 1',
        status: 'AVAILABLE',
      },
    });
  });

  it('should resolve equal per slot COGS and generate accurate OrderFinancialSnapshot', async () => {
    const orderNumber = `ORD-COSTTEST-${Date.now()}`;
    testOrder = await db.order.create({
      data: {
        orderNumber,
        totalAmount: 100000,
        discountAmount: 10000,
        grandTotal: 90000,
        cashPayableAmount: 90000,
        status: OrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
        items: {
          create: {
            variantId: testVariant.id,
            productName: 'Cost Test Product',
            variantName: testVariant.name,
            sku: testVariant.sku,
            unitPrice: 100000,
            quantity: 1,
            subtotal: 100000,
            deliveryType: 'ACCOUNT',
            costAmountSnapshot: 50000, // Rp50.000 allocated slot COGS
            isCostUnknown: false,
          },
        },
      },
    });

    const snapshot = await CostEngineService.generateOrderFinancialSnapshot(db, testOrder.id);
    expect(snapshot.subtotal).toBe(100000);
    expect(snapshot.grossRevenue).toBe(90000);
    expect(snapshot.recognizedCOGS).toBe(50000);
    expect(snapshot.grossProfit).toBe(40000); // Rp90.000 - Rp50.000 = Rp40.000
    expect(snapshot.grossMargin).toBe(44.44); // 40000 / 90000 * 100 = 44.44%
  });
});
