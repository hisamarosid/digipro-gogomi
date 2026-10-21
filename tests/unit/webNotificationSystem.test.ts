import { describe, it, expect, vi } from 'vitest';
import { NotificationEventService } from '../../src/services/notifications/notification-event.service';
import { CustomerNotificationCategory, AdminNotificationCategory, NotificationSeverity } from '../../generated/prisma';

vi.mock('../../src/lib/db/prisma', () => ({
  db: {
    customerNotification: {
      findFirst: vi.fn().mockImplementation(({ where }) => {
        if (where?.dedupeKey === 'DUP-KEY-01') {
          return Promise.resolve({ id: 'existing-notif', dedupeKey: 'DUP-KEY-01' });
        }
        return Promise.resolve(null);
      }),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'notif-new', ...data })),
      count: vi.fn().mockResolvedValue(3),
    },
    adminNotification: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        if (where?.dedupeKey === 'ADMIN-DUP-01') {
          return Promise.resolve({ id: 'admin-notif-1', dedupeKey: 'ADMIN-DUP-01', resolvedAt: null });
        }
        return Promise.resolve(null);
      }),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'admin-new', ...data })),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'admin-notif-1', ...data })),
    },
    adminNotificationRecipient: {
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
      count: vi.fn().mockResolvedValue(1),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }]),
    },
    customerNotificationPreference: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        if (where?.userId === 'user-no-promo') {
          return Promise.resolve({
            userId: 'user-no-promo',
            inAppPromotions: false,
            inAppCoins: true,
          });
        }
        return Promise.resolve(null);
      }),
      create: vi.fn().mockResolvedValue({
        userId: 'user-1',
        inAppPromotions: true,
        inAppCoins: true,
      }),
    },
  },
}));

describe('Web / In-App Notification System Tests', () => {
  it('should dispatch deduplicated customer notification safely', async () => {
    const notif = await NotificationEventService.emitCustomerEvent({
      userId: 'user-1',
      type: 'PAYMENT_SUCCESS',
      category: CustomerNotificationCategory.PAYMENT,
      title: 'Pembayaran Berhasil',
      message: 'Pembayaran Order #ORD-10293 berhasil diterima.',
      entityType: 'ORDER',
      entityId: 'ord-10293',
      actionUrl: '/account/orders',
      metadata: { orderNumber: 'ORD-10293', productName: 'Adobe Creative Cloud' },
    });

    expect(notif).toBeDefined();
    expect(notif?.title).toBe('Pembayaran Berhasil');
  });

  it('should suppress promotional notifications if customer disabled inAppPromotions', async () => {
    const notif = await NotificationEventService.emitCustomerEvent({
      userId: 'user-no-promo',
      type: 'SPECIAL_OFFER',
      category: CustomerNotificationCategory.PROMOTION,
      title: 'Diskon Spesial VIP',
      message: 'Dapatkan potongan harga 20% untuk renewal Adobe!',
    });

    expect(notif).toBeNull();
  });

  it('should dispatch operational admin notification and support auto-resolution', async () => {
    const adminNotif = await NotificationEventService.emitAdminEvent({
      type: 'FULFILLMENT_WAITING_STOCK',
      category: AdminNotificationCategory.FULFILLMENT,
      severity: NotificationSeverity.CRITICAL,
      title: 'Pesanan Berbayar Menunggu Stok',
      message: 'Order #ORD-999 (Adobe Shared 1B) belum memiliki stok eligible.',
      dedupeKey: 'FULFILLMENT_WAITING_STOCK:item-999',
    });

    expect(adminNotif).toBeDefined();

    // Test Resolution
    const resolved = await NotificationEventService.resolveAdminNotification('ADMIN-DUP-01');
    expect(resolved).toBeDefined();
    expect(resolved?.resolvedAt).toBeDefined();
  });

  it('should strip passwords, PINs, and secret credentials from notification metadata', async () => {
    const notif = await NotificationEventService.emitCustomerEvent({
      userId: 'user-1',
      type: 'PRODUCT_DELIVERED',
      category: CustomerNotificationCategory.PRODUCT,
      title: 'Produk Tersedia',
      message: 'Produk Adobe CC siap digunakan.',
      metadata: {
        orderNumber: 'ORD-100',
        productName: 'Adobe CC',
        passwordSecret: 'SuperSecretPass123!', // Must be stripped!
        licenseKey: 'LICENSE-KEY-SECRET',       // Must be stripped!
      },
    });

    expect(notif).toBeDefined();
    if (notif?.metadata) {
      const parsed = JSON.parse(notif.metadata);
      expect(parsed.orderNumber).toBe('ORD-100');
      expect(parsed.passwordSecret).toBeUndefined();
      expect(parsed.licenseKey).toBeUndefined();
    }
  });
});
