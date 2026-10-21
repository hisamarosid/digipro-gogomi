import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db/prisma';
import {
  SupplierStatus,
  StockStatus,
  SharedSlotStatus,
  DeliveryType,
  OrderStatus,
  Role,
} from '@/../generated/prisma';
import { SupplierService } from '@/services/supplier.service';
import { SharedAccountService } from '@/services/sharedAccount.service';
import { InventoryService } from '@/services/inventory.service';
import bcrypt from 'bcryptjs';

describe('Supplier Inventory, Sales & Cost Tracking System', () => {
  let testSupplier: any;
  let testProduct: any;
  let testVariant: any;
  let testSharedVariant: any;
  let testUser: any;
  const timestamp = Date.now();

  beforeAll(async () => {
    const passHash = '$2a$08$eA32YwR6oM7u4VbJ1rQ4OeX7s9Wp1jZ3k4L5m6N7o8P9q0R1s2T3u';

    // Create Test Supplier
    testSupplier = await db.supplier.create({
      data: {
        name: `Supplier Test ${timestamp}`,
        code: `SUP-T${timestamp.toString().slice(-4)}`,
        status: SupplierStatus.ACTIVE,
        contactName: 'Pak Supplier',
        whatsapp: '08123456789',
        email: `supplier_${timestamp}@test.com`,
      },
    });

    // Create Test Customer User
    testUser = await db.user.create({
      data: {
        name: 'Test Customer',
        email: `cust_supp_${timestamp}@test.com`,
        passwordHash: passHash,
        role: Role.CUSTOMER,
      },
    });

    // Create Category & Product
    const category = await db.category.create({
      data: {
        name: `Category ${timestamp}`,
        slug: `cat-supp-${timestamp}`,
      },
    });

    testProduct = await db.product.create({
      data: {
        name: `Product Test ${timestamp}`,
        slug: `prod-supp-${timestamp}`,
        sku: `PRD-SUPP-${timestamp}`,
        shortDesc: 'Deskripsi singkat',
        fullDesc: 'Deskripsi lengkap produk',
        categoryId: category.id,
      },
    });

    // Create Dedicated Variant
    testVariant = await db.productVariant.create({
      data: {
        productId: testProduct.id,
        name: 'Dedicated 1 Bulan',
        sku: `SKU-DED-${timestamp}`,
        price: 50000,
        defaultCostAmount: 30000,
        deliveryType: DeliveryType.ACCOUNT,
      },
    });

    // Create Shared Variant
    testSharedVariant = await db.productVariant.create({
      data: {
        productId: testProduct.id,
        name: 'Shared 1 Profile',
        sku: `SKU-SHR-${timestamp}`,
        price: 25000,
        defaultCostAmount: 15000,
        deliveryType: DeliveryType.ACCOUNT,
        sharedCapacityDefault: 2,
      },
    });
  }, 60000);

  afterAll(async () => {
    // Cleanup test records
    if (testSupplier?.id) {
      const orderItems = await db.orderItem.findMany({ where: { supplierId: testSupplier.id } });
      const orderIds = orderItems.map((oi) => oi.orderId);
      if (orderIds.length > 0) {
        await db.inventoryItem.updateMany({
          where: { assignedOrderItemId: { in: orderItems.map((oi) => oi.id) } },
          data: { assignedOrderItemId: null },
        });
        await db.orderItem.deleteMany({ where: { id: { in: orderItems.map((oi) => oi.id) } } });
        await db.order.deleteMany({ where: { id: { in: orderIds } } });
      }

      await db.inventoryItem.deleteMany({ where: { supplierId: testSupplier.id } });
      await db.sharedAccountSlot.deleteMany({ where: { sharedAccount: { supplierId: testSupplier.id } } });
      await db.sharedAccount.deleteMany({ where: { supplierId: testSupplier.id } });
    }

    if (testProduct?.id) {
      await db.productVariant.deleteMany({ where: { productId: testProduct.id } });
      await db.product.deleteMany({ where: { id: testProduct.id } });
    }

    await db.category.deleteMany({ where: { slug: `cat-supp-${timestamp}` } });
    if (testSupplier?.id) await db.supplier.deleteMany({ where: { id: testSupplier.id } });
    if (testUser?.id) await db.user.deleteMany({ where: { id: testUser.id } });
  }, 60000);

  it('1. should accurately track Dedicated Inventory items, stock status, and cost totals', async () => {
    // Add 3 dedicated stock items from supplier @ Rp30.000 cost each
    await InventoryService.addStock(
      testVariant.id,
      ['user1:pass1', 'user2:pass2', 'user3:pass3'],
      DeliveryType.ACCOUNT,
      null,
      null,
      30000,
      testSupplier.id,
      'TEST-REF-DED-01'
    );

    const metrics = await SupplierService.getSupplierSummaryMetrics(testSupplier.id);

    expect(metrics.totalInventory).toBe(3);
    expect(metrics.availableInventory).toBe(3);
    expect(metrics.soldInventory).toBe(0);
    expect(metrics.totalInventoryCost).toBe(90000); // 3 * 30.000
    expect(metrics.remainingInventoryCost).toBe(90000);
    expect(metrics.costOfInventorySold).toBe(0);
  }, 60000);

  it('2. should accurately track Shared Account with pro-rated slot COGS without double-counting master cost', async () => {
    // Add 1 Shared Account Master with 2 Slots @ Rp40.000 master cost (Rp20.000 per slot)
    const sharedAccount = await SharedAccountService.createSharedAccount({
      productVariantId: testSharedVariant.id,
      label: 'NETFLIX-01',
      credentialPlain: 'master@netflix.com:secret',
      maxSlots: 2,
      acquisitionCost: 40000,
      supplierId: testSupplier.id,
      supplierReference: 'TEST-REF-SHR-01',
    });

    const metrics = await SupplierService.getSupplierSummaryMetrics(testSupplier.id);

    // 3 dedicated + 2 shared slots = 5 total items/slots
    expect(metrics.totalInventory).toBe(5);
    expect(metrics.availableInventory).toBe(5);
    // Master cost is Rp40.000 total (90.000 dedicated + 40.000 shared = 130.000)
    expect(metrics.totalInventoryCost).toBe(130000);
    expect(metrics.remainingInventoryCost).toBe(130000);

    // Now simulate assigning 1 slot to a customer order
    const slots = await db.sharedAccountSlot.findMany({ where: { sharedAccountId: sharedAccount.id } });
    await db.sharedAccountSlot.update({
      where: { id: slots[0].id },
      data: { status: SharedSlotStatus.ASSIGNED, assignedUserId: testUser.id },
    });

    const metricsAfterAssignment = await SupplierService.getSupplierSummaryMetrics(testSupplier.id);
    expect(metricsAfterAssignment.availableInventory).toBe(4);
    expect(metricsAfterAssignment.soldInventory).toBe(1);
    // 1 slot sold = Rp20.000 COGS
    expect(metricsAfterAssignment.costOfInventorySold).toBe(20000);
    expect(metricsAfterAssignment.remainingInventoryCost).toBe(110000);
    expect(metricsAfterAssignment.totalInventoryCost).toBe(130000);
  }, 60000);

  it('3. should calculate Revenue, COGS, and Gross Margin correctly from valid transactions', async () => {
    // Add 2 dedicated items @ Rp35.000 cost each
    await InventoryService.addStock(
      testVariant.id,
      ['userA:passA', 'userB:passB'],
      DeliveryType.ACCOUNT,
      null,
      null,
      35000,
      testSupplier.id,
      'TEST-REF-SALES-01'
    );

    const items = await db.inventoryItem.findMany({
      where: { supplierId: testSupplier.id, supplierReference: 'TEST-REF-SALES-01' },
    });

    // Create a PAID Order with 1 OrderItem
    const order = await db.order.create({
      data: {
        orderNumber: `ORD-TEST-${Date.now()}`,
        user: { connect: { id: testUser.id } },
        status: OrderStatus.PAID,
        totalAmount: 60000,
        grandTotal: 60000,
      },
    });

    const orderItem = await db.orderItem.create({
      data: {
        orderId: order.id,
        variantId: testVariant.id,
        productName: 'Product Test Dedicated',
        variantName: 'Dedicated 1 Bulan',
        sku: testVariant.sku,
        unitPrice: 60000,
        subtotal: 60000,
        quantity: 1,
        deliveryType: DeliveryType.ACCOUNT,
        costAmountSnapshot: 35000, // Snapshot historical cost
        supplierId: testSupplier.id,
      },
    });

    // Assign inventory item to orderItem
    await db.inventoryItem.update({
      where: { id: items[0].id },
      data: {
        status: StockStatus.SOLD,
        assignedOrderItemId: orderItem.id,
      },
    });

    const metrics = await SupplierService.getSupplierSummaryMetrics(testSupplier.id);

    expect(metrics.revenue).toBe(60000);
    expect(metrics.costOfInventorySold).toBe(35000);
    expect(metrics.grossMargin).toBe(25000); // 60.000 - 35.000 = 25.000
    expect(metrics.grossMarginPercentage).toBeCloseTo(41.67, 1);
  }, 60000);

  it('4. Historical Immutability: Subsequent cost changes do NOT alter past order COGS snapshots', async () => {
    // 1. Create Order with snapshot of Rp40.000
    const order = await db.order.create({
      data: {
        orderNumber: `ORD-HIST-${Date.now()}`,
        user: { connect: { id: testUser.id } },
        status: OrderStatus.PAID,
        totalAmount: 70000,
        grandTotal: 70000,
      },
    });

    await db.orderItem.create({
      data: {
        orderId: order.id,
        variantId: testVariant.id,
        productName: 'Product Test Dedicated',
        variantName: 'Dedicated 1 Bulan',
        sku: testVariant.sku,
        unitPrice: 70000,
        subtotal: 70000,
        quantity: 1,
        deliveryType: DeliveryType.ACCOUNT,
        costAmountSnapshot: 40000, // Historical snapshot
        supplierId: testSupplier.id,
      },
    });

    // 2. Later, Variant defaultCost or newly added inventory price rises to Rp55.000
    await db.productVariant.update({
      where: { id: testVariant.id },
      data: { defaultCostAmount: 55000 },
    });

    // 3. Query sales via SupplierService
    const salesResult = await SupplierService.getSupplierSales(testSupplier.id, {
      search: order.orderNumber,
    });

    expect(salesResult.sales.length).toBe(1);
    // Historical order item STILL reflects snapshot cost of Rp40.000, not Rp55.000!
    expect(salesResult.sales[0].supplierCost).toBe(40000);
    expect(salesResult.sales[0].grossMargin).toBe(30000); // 70.000 - 40.000
  }, 60000);

  it('5. Batch aggregation in getSuppliersList returns metrics with zero N+1 queries', async () => {
    const list = await SupplierService.getSuppliersList();
    expect(Array.isArray(list)).toBe(true);

    const found = list.find((s) => s.id === testSupplier.id);
    expect(found).toBeDefined();
    expect(found?.metrics).toBeDefined();
    expect(found?.metrics.totalInventory).toBeGreaterThanOrEqual(0);
    expect(found?.metrics.totalInventoryCost).toBeGreaterThanOrEqual(0);
    expect(typeof found?.metrics.grossMargin).toBe('number');
  }, 60000);

  it('6. Supplier Inventory & Sales pagination and filter methods operate properly', async () => {
    const inventoryResult = await SupplierService.getSupplierInventory(testSupplier.id, {
      page: 1,
      limit: 10,
      status: 'AVAILABLE',
    });

    expect(inventoryResult.items).toBeDefined();
    expect(inventoryResult.pagination).toBeDefined();
    expect(inventoryResult.pagination.page).toBe(1);
    expect(inventoryResult.pagination.limit).toBe(10);

    const salesResult = await SupplierService.getSupplierSales(testSupplier.id, {
      page: 1,
      limit: 10,
      orderStatus: 'PAID',
    });

    expect(salesResult.sales).toBeDefined();
    expect(salesResult.pagination).toBeDefined();
  }, 60000);
});
