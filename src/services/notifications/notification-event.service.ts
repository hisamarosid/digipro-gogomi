import { db } from '@/lib/db/prisma';
import {
  AdminNotificationCategory,
  CustomerNotificationCategory,
  NotificationSeverity,
  Role,
} from '../../../generated/prisma';
import { SafeNotificationMetadata, SendAdminEventInput, SendCustomerEventInput } from './notification-types';
import { CustomerTemplates, AdminTemplates, formatNotificationTemplate } from './notification-templates';
import { NotificationPreferenceService } from './notification-preference.service';
import { FeatureFlagService } from '../featureFlag.service';
import { TelegramService } from '../telegram.service';

export class NotificationEventService {
  static isCustomerNotificationSuppressed(type: string, title?: string, message?: string, category?: string): boolean {
    const t = (type || '').toUpperCase();
    const text = `${title || ''} ${message || ''}`.toLowerCase();

    // 1. Email verification & password reset tokens should NEVER be shown in web in-app notifications
    if (
      t === 'EMAIL_VERIFICATION_SENT' ||
      t === 'PASSWORD_RESET_REQUESTED' ||
      t.includes('VERIFICATION_SENT') ||
      t.includes('EMAIL_VERIFY') ||
      t.includes('TOKEN') ||
      text.includes('verifikasi email') ||
      text.includes('verifikasi akun') ||
      text.includes('reset password')
    ) return true;

    if (
      t.includes('PENDING') || t.includes('COIN_PENDING') || t.includes('COIN_HOLD') || t.includes('HOLD') ||
      text.includes('pending coin') || text.includes('coin pending') || text.includes('di-hold') || text.includes('hold period')
    ) return true;

    if (t === 'ORDER_PROCESSING' || text.includes('pesanan sedang diproses') || text.includes('minor update')) return true;

    if (t.includes('RETRY') || t.includes('FULFILLMENT_RETRY') || text.includes('fulfillment retry') || text.includes('percobaan ulang')) return true;

    if (t.includes('STOCK_MOVEMENT') || t.includes('INTERNAL_STOCK') || text.includes('stock movement') || text.includes('internal stock') || text.includes('perpindahan stok')) return true;

    if (t.includes('LOYALTY_PROGRESS') || t.includes('MILESTONE_PROGRESS') || text.includes('loyalty progress') || text.includes('kemajuan loyalty') || text.includes('progress loyalty')) return true;

    if (t.includes('RECOMMENDATION') || category === 'RECOMMENDATION' || text.includes('rekomendasi') || text.includes('recommendation')) return true;

    if (t.includes('RECENTLY_VIEWED') || text.includes('recently viewed') || text.includes('terakhir dilihat')) return true;

    if (t.includes('MINOR_PRICE') || t.includes('PRICE_CHANGE_MINOR') || text.includes('perubahan harga kecil') || text.includes('minor price')) return true;

    return false;
  }

  static isAdminNotificationSuppressed(type: string, title?: string, message?: string, category?: string): boolean {
    const t = (type || '').toUpperCase();
    const text = `${title || ''} ${message || ''}`.toLowerCase();

    if (t === 'ORDER_CREATED' || text.includes('pesanan baru dibuat') || text.includes('order baru dibuat') || text.includes('pesanan baru #')) return true;

    if (t.includes('COIN_ADDED') || t.includes('COIN_GRANT') || t.includes('BONUS_ADDED') || text.includes('coin bertambah') || text.includes('coin ditambahkan') || text.includes('tambah coin')) return true;

    if (t.includes('WISHLIST') || t.includes('WISHLIST_OPENED') || text.includes('buka wishlist') || text.includes('wishlist customer') || text.includes('customer wishlist')) return true;

    if (t.includes('PRODUCT_VIEWED') || t.includes('PRODUCT_LOOK') || text.includes('produk dilihat') || text.includes('product viewed')) return true;

    if (t === 'FULFILLMENT_SUCCESS' || t === 'FULFILLMENT_COMPLETED' || t === 'PRODUCT_DELIVERED' || text.includes('fulfillment berhasil') || text.includes('fulfillment success')) return true;

    if (t === 'EMAIL_SENT' || t === 'EMAIL_SUCCESS' || text.includes('email berhasil') || text.includes('email terkirim')) return true;

    return false;
  }

  /**
   * Dispatches safe Customer Notification driven by business event
   */
  static async emitCustomerEvent(input: SendCustomerEventInput) {
    try {
      if (!input.userId) return null;

      // Check WEB_NOTIFICATIONS feature flag
      if (!(await FeatureFlagService.isEnabled('WEB_NOTIFICATIONS'))) return null;

      // Check if notification is suppressed
      if (this.isCustomerNotificationSuppressed(input.type, input.title, input.message, input.category)) {
        return null;
      }

      // 1. Verify user notification preferences
      const isEnabled = await NotificationPreferenceService.isCategoryEnabled(input.userId, input.category);
      if (!isEnabled) return null;

      // 2. Deduplication check if dedupeKey provided
      if (input.dedupeKey) {
        const existing = await db.customerNotification.findFirst({
          where: { userId: input.userId, dedupeKey: input.dedupeKey },
        });
        if (existing) return existing;
      }

      // 3. Format message & title safely
      const formattedTitle = formatNotificationTemplate(input.title, input.metadata);
      const formattedMessage = formatNotificationTemplate(input.message, input.metadata);

      // 4. Sanitize metadata (remove password, credentials, pins)
      const safeMetadata = input.metadata ? this.sanitizeMetadata(input.metadata) : null;

      // 5. Create customer notification
      return await db.customerNotification.create({
        data: {
          userId: input.userId,
          type: input.type,
          category: input.category,
          title: formattedTitle,
          message: formattedMessage,
          entityType: input.entityType,
          entityId: input.entityId,
          actionUrl: input.actionUrl,
          dedupeKey: input.dedupeKey,
          metadata: safeMetadata ? JSON.stringify(safeMetadata) : null,
        },
      });
    } catch (error) {
      console.error('[NotificationEventService emitCustomerEvent Error]:', error);
      return null;
    }
  }

  /**
   * Dispatches Operational Admin Notification via Telegram
   */
  static async emitAdminEvent(input: SendAdminEventInput) {
    try {
      // Check if notification is suppressed
      if (this.isAdminNotificationSuppressed(input.type, input.title, input.message, input.category)) {
        return null;
      }

      const formattedTitle = formatNotificationTemplate(input.title, input.metadata);
      const formattedMessage = formatNotificationTemplate(input.message, input.metadata);

      // Determine severity icon
      let prefix = 'ℹ️';
      if (input.severity === NotificationSeverity.HIGH) prefix = '⚠️';
      if (input.severity === NotificationSeverity.CRITICAL) prefix = '🚨';
      if (input.type.includes('SUCCESS') || input.type.includes('COMPLETED')) prefix = '✅';

      const telegramText = `<b>[GOGOMI STORE]</b>\n\n${prefix} <b>${formattedTitle}</b>\n\n${formattedMessage}`;

      await TelegramService.sendMessage({
        eventType: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        dedupeKey: input.dedupeKey,
        text: telegramText,
        actionUrl: input.actionUrl,
      });

      return { success: true };
    } catch (error) {
      console.error('[NotificationEventService emitAdminEvent Error]:', error);
      return null;
    }
  }

  /**
   * Resolves active operational admin notification (e.g. when low stock or waiting fulfillment completes)
   */
  static async resolveAdminNotification(dedupeKey: string) {
    try {
      const existing = await db.adminNotification.findUnique({
        where: { dedupeKey },
      });

      if (existing && !existing.resolvedAt) {
        return await db.adminNotification.update({
          where: { dedupeKey },
          data: { resolvedAt: new Date() },
        });
      }
      return existing;
    } catch (error) {
      console.error('[NotificationEventService resolveAdminNotification Error]:', error);
      return null;
    }
  }

  /**
   * Removes sensitive fields (passwords, PINs, license keys, API keys) from metadata JSON
   */
  private static sanitizeMetadata(metadata: SafeNotificationMetadata): SafeNotificationMetadata {
    const clean: SafeNotificationMetadata = {};
    for (const [key, val] of Object.entries(metadata)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('password') ||
        lower.includes('credential') ||
        lower.includes('pin') ||
        lower.includes('license') ||
        lower.includes('secret') ||
        lower.includes('key')
      ) {
        continue;
      }
      clean[key] = val;
    }
    return clean;
  }
}
