import { db } from '@/lib/db/prisma';
import { CustomerNotificationCategory } from '../../generated/prisma';
import { NotificationOrchestrator } from './email/email-orchestrator';
import { SubscriptionService } from './subscription.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Remind customers this many days before their subscription ends. */
export const REMINDER_DAYS_BEFORE = 3;
/** Only tell customers about an expiry that happened within this many days (avoids mailing old history). */
export const EXPIRED_NOTICE_WINDOW_DAYS = 3;

export type ReminderStage = 'EXPIRING' | 'EXPIRED';

/**
 * Decides which reminder (if any) a subscription needs right now.
 * - EXPIRING: ends within the next REMINDER_DAYS_BEFORE days
 * - EXPIRED: ended within the last EXPIRED_NOTICE_WINDOW_DAYS days
 */
export function classifyReminderStage(expiresAt: Date, now: Date): ReminderStage | null {
  const diff = expiresAt.getTime() - now.getTime();
  if (diff > 0 && diff <= REMINDER_DAYS_BEFORE * DAY_MS) return 'EXPIRING';
  if (diff <= 0 && diff >= -EXPIRED_NOTICE_WINDOW_DAYS * DAY_MS) return 'EXPIRED';
  return null;
}

/** One email/web notification per subscription, per stage, per expiry date (a renewal gets fresh reminders). */
export function buildReminderDedupeKey(stage: ReminderStage, subscriptionId: string, expiresAt: Date): string {
  return `SUB_REMIND:${stage}:${subscriptionId}:${expiresAt.getTime()}`;
}

export class SubscriptionReminderService {
  static async sendDueReminders(now: Date = new Date()) {
    // Subscriptions are created lazily when a customer opens their account; make sure none are missed.
    try {
      await SubscriptionService.syncAllSubscriptions();
    } catch (err: any) {
      console.error('[SubscriptionReminder] sync failed:', err?.message);
    }

    const from = new Date(now.getTime() - EXPIRED_NOTICE_WINDOW_DAYS * DAY_MS);
    const to = new Date(now.getTime() + REMINDER_DAYS_BEFORE * DAY_MS);

    const candidates = await db.subscription.findMany({
      where: {
        status: { not: 'CANCELLED' },
        expiresAt: { gte: from, lte: to },
        // Real subscription products only; warranty-only items must not trigger "subscription ended" mails.
        variant: { subscriptionDays: { gt: 0 } },
        user: { disabled: false },
      },
      select: {
        id: true,
        userId: true,
        variantId: true,
        expiresAt: true,
        user: { select: { name: true, email: true } },
        variant: { select: { name: true, product: { select: { name: true } } } },
      },
    });

    let sent = 0;
    let skippedRenewed = 0;
    let skippedNoStage = 0;

    for (const sub of candidates) {
      const stage = classifyReminderStage(sub.expiresAt, now);
      if (!stage) {
        skippedNoStage++;
        continue;
      }

      // Already renewed through a new subscription row for the same product: do not nag.
      const renewed = await db.subscription.findFirst({
        where: {
          userId: sub.userId,
          variantId: sub.variantId,
          id: { not: sub.id },
          status: { not: 'CANCELLED' },
          expiresAt: { gt: new Date(Math.max(sub.expiresAt.getTime(), now.getTime())) },
        },
        select: { id: true },
      });
      if (renewed) {
        skippedRenewed++;
        continue;
      }

      const productName = sub.variant.product.name;
      const variantName = sub.variant.name;
      const label = `${productName} (${variantName})`;
      const daysRemaining = Math.max(1, Math.ceil((sub.expiresAt.getTime() - now.getTime()) / DAY_MS));
      const isExpiring = stage === 'EXPIRING';

      await NotificationOrchestrator.dispatchEvent({
        userId: sub.userId,
        userEmail: sub.user.email,
        eventType: isExpiring ? 'SUBSCRIPTION_EXPIRING' : 'SUBSCRIPTION_EXPIRED',
        title: isExpiring
          ? `Masa Aktif ${productName} Berakhir Dalam ${daysRemaining} Hari`
          : `Masa Aktif ${productName} Telah Berakhir`,
        message: isExpiring
          ? `Langganan ${label} akan berakhir dalam ${daysRemaining} hari. Perpanjang sekarang agar akses tetap aktif.`
          : `Langganan ${label} telah berakhir. Perpanjang melalui Pusat Renewal untuk mengaktifkannya kembali.`,
        entityType: 'Subscription',
        entityId: sub.id,
        actionUrl: '/account/renewals',
        emailTemplateKey: isExpiring ? 'SUBSCRIPTION_EXPIRING' : 'SUBSCRIPTION_EXPIRED',
        emailCategory: 'REMINDER',
        metadata: {
          customerName: sub.user.name,
          productName,
          variantName,
          daysRemaining,
          category: CustomerNotificationCategory.SUBSCRIPTION,
        },
        dedupeKey: buildReminderDedupeKey(stage, sub.id, sub.expiresAt),
      });
      sent++;
    }

    return { candidates: candidates.length, processed: sent, skippedRenewed, skippedNoStage };
  }
}
