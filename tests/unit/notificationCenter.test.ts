import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/lib/db/prisma';
import { NotificationService } from '../../src/services/notification.service';
import { AdminNotificationCategory, CustomerNotificationCategory } from '../../generated/prisma';

describe('Priority 2 — Admin & Customer Notification Center Tests', { timeout: 30000 }, () => {
  let testUser: any;

  beforeEach(async () => {
    await db.customerNotification.deleteMany({ where: { user: { email: 'notif-user@test.id' } } });
    await db.adminNotificationRecipient.deleteMany({ where: { user: { email: 'notif-user@test.id' } } });
    await db.user.deleteMany({ where: { email: 'notif-user@test.id' } });

    testUser = await db.user.create({
      data: {
        email: 'notif-user@test.id',
        name: 'Notif Test User',
        passwordHash: 'hash',
        role: 'CUSTOMER',
      },
    });
  });

  it('should dispatch deduplicated customer notification and update unread count', async () => {
    const dedupeKey = `test-dedupe-${Date.now()}`;

    const n1 = await NotificationService.sendCustomerNotification({
      userId: testUser.id,
      type: 'PAYMENT_SUCCESS',
      category: CustomerNotificationCategory.PAYMENT,
      title: 'Pembayaran Berhasil',
      message: 'Order #ORD-1001 lunas.',
      dedupeKey,
    });

    const n2 = await NotificationService.sendCustomerNotification({
      userId: testUser.id,
      type: 'PAYMENT_SUCCESS',
      category: CustomerNotificationCategory.PAYMENT,
      title: 'Pembayaran Berhasil',
      message: 'Order #ORD-1001 lunas.',
      dedupeKey,
    });

    expect(n1?.id).toBe(n2?.id);

    const unread = await NotificationService.getUnreadCustomerCount(testUser.id);
    expect(unread).toBe(1);

    await NotificationService.markCustomerNotificationRead(testUser.id, n1?.id);
    const unreadAfter = await NotificationService.getUnreadCustomerCount(testUser.id);
    expect(unreadAfter).toBe(0);
  });
});
