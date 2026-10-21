import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../src/lib/db/prisma';
import { OrderService } from '../../src/services/order.service';
import { DomainEventService } from '../../src/services/domainEvent.service';
import { TelegramService } from '../../src/services/telegram.service';

describe('Admin Notification Order Flow Tests', () => {
  let adminUser: any;
  let variant: any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    // 1. Create test admin user
    adminUser = await db.user.create({
      data: {
        name: 'Admin Tester',
        email: `admin_tester_${Date.now()}@gmail.com`,
        passwordHash: 'hashedpass',
        role: 'SUPER_ADMIN',
      },
    });

    // 2. Create test product & variant
    const category = await db.category.create({
      data: { name: `Cat ${Date.now()}`, slug: `cat-${Date.now()}` },
    });

    const product = await db.product.create({
      data: {
        name: `Test Product ${Date.now()}`,
        slug: `test-prod-${Date.now()}`,
        sku: `PROD-SKU-${Date.now()}`,
        shortDesc: 'Test short description',
        fullDesc: 'Test full description',
        categoryId: category.id,
        status: 'ACTIVE',
      },
    });

    variant = await db.productVariant.create({
      data: {
        productId: product.id,
        name: 'Standard Variant',
        price: 50000,
        sku: `SKU-${Date.now()}`,
        deliveryModel: 'DEDICATED_ACCOUNT',
      },
    });
  });

  it('1. Should suppress unpaid ORDER_CREATED noise to prevent admin notification spam', async () => {
    const tgSpy = vi.spyOn(TelegramService, 'sendOrderPaidNotification');

    const order = await OrderService.createOrder({
      guestName: 'Budi Santoso',
      guestEmail: 'budi@gmail.com',
      guestPhone: '08123456789',
      items: [{ variantId: variant.id, quantity: 1 }],
    });

    expect(order).toBeDefined();

    // Check that unpaid raw ORDER_CREATED is not dispatched to Telegram
    expect(tgSpy).not.toHaveBeenCalled();
  });

  it('2. Should trigger Telegram Admin Notification when an order payment is settled', async () => {
    const tgSpy = vi.spyOn(TelegramService, 'sendOrderPaidNotification').mockResolvedValue({ success: true } as any);

    const order = await OrderService.createOrder({
      guestName: 'Siti Aminah',
      guestEmail: 'siti@gmail.com',
      guestPhone: '08123456789',
      items: [{ variantId: variant.id, quantity: 1 }],
    });

    // Publish PAYMENT_SETTLED event
    await DomainEventService.publish({
      eventName: 'PAYMENT_SETTLED',
      orderId: order.id,
      orderNumber: order.orderNumber,
    });

    expect(tgSpy).toHaveBeenCalledTimes(1);
    const calledArg = tgSpy.mock.calls[0][0];
    expect(calledArg.orderNumber).toBe(order.orderNumber);
    expect(calledArg.id).toBe(order.id);
  });
});
