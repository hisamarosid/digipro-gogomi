import { db } from '@/lib/db/prisma';
import {
  AdminNotificationCategory,
  CustomerNotificationCategory,
  NotificationSeverity,
  Role,
} from '../../generated/prisma';
import { NotificationEventService } from './notifications/notification-event.service';
import { NotificationPreferenceService } from './notifications/notification-preference.service';

export interface SendAdminNotificationInput {
  type: string;
  category: AdminNotificationCategory;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  dedupeKey?: string;
  metadata?: Record<string, any>;
  targetRoles?: Role[];
}

export interface SendCustomerNotificationInput {
  userId: string;
  type: string;
  category: CustomerNotificationCategory;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  dedupeKey?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Dispatches deduplicated Admin Notification and routes to appropriate staff roles
   */
  static async sendAdminNotification(input: SendAdminNotificationInput) {
    return await NotificationEventService.emitAdminEvent(input);
  }

  /**
   * Dispatches Customer In-App Notification considering user preferences
   */
  static async sendCustomerNotification(input: SendCustomerNotificationInput) {
    return await NotificationEventService.emitCustomerEvent(input);
  }

  /**
   * Gets unread admin notification count for a specific admin user
   */
  static async getUnreadAdminCount(userId: string): Promise<number> {
    return await db.adminNotificationRecipient.count({
      where: {
        userId,
        readAt: null,
        dismissedAt: null,
      },
    });
  }

  /**
   * Gets unread customer notification count for a specific user
   */
  static async getUnreadCustomerCount(userId: string): Promise<number> {
    return await db.customerNotification.count({
      where: {
        userId,
        readAt: null,
        dismissedAt: null,
      },
    });
  }

  /**
   * Retrieves customer notifications with pagination, category filter, and unread filter
   */
  static async getCustomerNotifications(params: {
    userId: string;
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    category?: CustomerNotificationCategory;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 20);
    const skip = (page - 1) * limit;

    const where: any = {
      userId: params.userId,
      dismissedAt: null,
    };

    if (params.unreadOnly) {
      where.readAt = null;
    }
    if (params.category) {
      where.category = params.category;
    }

    const [rawItems, rawTotal, rawUnread] = await Promise.all([
      db.customerNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.customerNotification.count({ where }),
      db.customerNotification.count({
        where: { userId: params.userId, readAt: null, dismissedAt: null },
      }),
    ]);

    const items = rawItems.filter(
      (item) => !NotificationEventService.isCustomerNotificationSuppressed(item.type, item.title, item.message, item.category)
    );

    return {
      items,
      total: items.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(items.length / limit)),
      unreadCount: items.filter((i) => !i.readAt).length,
    };
  }

  /**
   * Retrieves admin notifications with pagination, severity filter, category filter, and resolution status
   */
  static async getAdminNotifications(params: {
    userId: string;
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    unresolvedOnly?: boolean;
    severity?: NotificationSeverity;
    category?: AdminNotificationCategory;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 20);
    const skip = (page - 1) * limit;

    const where: any = {
      recipients: {
        some: {
          userId: params.userId,
          dismissedAt: null,
          ...(params.unreadOnly ? { readAt: null } : {}),
        },
      },
    };

    if (params.severity) {
      where.severity = params.severity;
    }
    if (params.category) {
      where.category = params.category;
    }
    if (params.unresolvedOnly) {
      where.resolvedAt = null;
    }

    const [items, total, unreadCount, criticalUnresolved] = await Promise.all([
      db.adminNotification.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          recipients: {
            where: { userId: params.userId },
            select: { readAt: true, dismissedAt: true },
          },
        },
      }),
      db.adminNotification.count({ where }),
      db.adminNotificationRecipient.count({
        where: { userId: params.userId, readAt: null, dismissedAt: null },
      }),
      db.adminNotification.count({
        where: {
          severity: NotificationSeverity.CRITICAL,
          resolvedAt: null,
        },
      }),
    ]);

    const formattedItems = items
      .filter((item) => !NotificationEventService.isAdminNotificationSuppressed(item.type, item.title, item.message, item.category))
      .map((item) => ({
        ...item,
        isRead: Boolean(item.recipients[0]?.readAt),
        readAt: item.recipients[0]?.readAt || null,
      }));

    return {
      items: formattedItems,
      total: formattedItems.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(formattedItems.length / limit)),
      unreadCount: formattedItems.filter((i) => !i.isRead).length,
      criticalUnresolved,
    };
  }

  /**
   * Marks admin notifications as read
   */
  static async markAdminNotificationRead(userId: string, notificationId?: string) {
    if (notificationId) {
      return await db.adminNotificationRecipient.updateMany({
        where: { userId, notificationId },
        data: { readAt: new Date() },
      });
    }
    return await db.adminNotificationRecipient.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * Marks customer notifications as read
   */
  static async markCustomerNotificationRead(userId: string, notificationId?: string) {
    if (notificationId) {
      return await db.customerNotification.updateMany({
        where: { userId, id: notificationId },
        data: { readAt: new Date() },
      });
    }
    return await db.customerNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * Dismisses customer notification (soft hide without DB delete)
   */
  static async dismissCustomerNotification(userId: string, notificationId: string) {
    return await db.customerNotification.updateMany({
      where: { userId, id: notificationId },
      data: { dismissedAt: new Date() },
    });
  }

  /**
   * Dismisses admin notification (soft hide for particular recipient)
   */
  static async dismissAdminNotification(userId: string, notificationId: string) {
    return await db.adminNotificationRecipient.updateMany({
      where: { userId, notificationId },
      data: { dismissedAt: new Date() },
    });
  }

  /**
   * Manually resolves an operational admin notification
   */
  static async resolveAdminNotification(notificationId: string) {
    return await db.adminNotification.update({
      where: { id: notificationId },
      data: { resolvedAt: new Date() },
    });
  }
}
