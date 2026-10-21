import { NotificationEventService } from '../notifications/notification-event.service';
import { EmailQueueService } from './email-queue.service';
import { CustomerNotificationCategory, AdminNotificationCategory, NotificationSeverity, JobPriority } from '../../../generated/prisma';
import { EmailCategory } from './email-types';

export class NotificationOrchestrator {
  /**
   * Dispatches a unified domain event across both Web/In-App and Email channels
   */
  public static async dispatchEvent(params: {
    userId?: string | null;
    userEmail?: string | null;
    eventType: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
    dedupeKey?: string;
    emailTemplateKey?: string;
    emailCategory?: EmailCategory;
    priority?: JobPriority;
  }) {
    // 1. Dispatch Web/In-App Notification
    // Security & Auth Tokens (Email Verification, Password Reset) are strictly sent via email, never in-app web notifications
    const isAuthTokenEvent = [
      'EMAIL_VERIFICATION_SENT',
      'PASSWORD_RESET_REQUESTED',
      'VERIFY_EMAIL',
      'PASSWORD_RESET',
    ].includes(params.eventType);

    if (params.userId && !isAuthTokenEvent) {
      await NotificationEventService.emitCustomerEvent({
        userId: params.userId,
        type: params.eventType,
        category: (params.metadata?.category as CustomerNotificationCategory) || CustomerNotificationCategory.ORDER,
        title: params.title,
        message: params.message,
        entityType: params.entityType,
        entityId: params.entityId,
        actionUrl: params.actionUrl,
        metadata: params.metadata,
        dedupeKey: params.dedupeKey ? `WEB:${params.dedupeKey}` : undefined,
      });
    }

    // 2. Dispatch Email Notification (if email is provided & emailTemplateKey is specified)
    if (params.userEmail && params.emailTemplateKey) {
      await EmailQueueService.enqueueEmailJob({
        recipientUserId: params.userId || null,
        recipientEmail: params.userEmail,
        eventType: params.eventType,
        category: params.emailCategory || 'TRANSACTIONAL',
        templateKey: params.emailTemplateKey,
        subject: params.title,
        templateData: {
          customerName: params.metadata?.customerName || 'Customer',
          orderNumber: params.metadata?.orderNumber,
          productName: params.metadata?.productName,
          variantName: params.metadata?.variantName,
          amount: params.metadata?.amount,
          daysRemaining: params.metadata?.daysRemaining,
          coinAmount: params.metadata?.coinAmount,
          tierName: params.metadata?.tierName,
          ticketNumber: params.metadata?.ticketNumber,
          verificationUrl: params.metadata?.verificationUrl,
          resetUrl: params.metadata?.resetUrl,
          actionUrl: params.actionUrl,
          newPrice: params.metadata?.newPrice,
          previousPrice: params.metadata?.previousPrice,
          reason: params.metadata?.reason,
          ...params.metadata,
        },
        entityType: params.entityType,
        entityId: params.entityId,
        priority: params.priority || JobPriority.NORMAL,
        dedupeKey: params.dedupeKey ? `EMAIL:${params.dedupeKey}` : undefined,
      });

      // Immediately process queue in dev/background
      process.nextTick(() => {
        EmailQueueService.processEmailQueue().catch(() => {});
      });
    }
  }

  /**
   * Dispatches an Admin Critical Operational Event across Web Alert & Admin Email
   */
  public static async dispatchAdminEvent(params: {
    eventType: string;
    title: string;
    message: string;
    severity?: NotificationSeverity;
    category?: AdminNotificationCategory;
    actionUrl?: string;
    dedupeKey?: string;
    adminEmail?: string;
  }) {
    // 1. Dispatch Web Admin Alert
    await NotificationEventService.emitAdminEvent({
      type: params.eventType,
      category: params.category || AdminNotificationCategory.SYSTEM,
      severity: params.severity || NotificationSeverity.HIGH,
      title: params.title,
      message: params.message,
      actionUrl: params.actionUrl,
      dedupeKey: params.dedupeKey,
    });

    // 2. Dispatch Admin Email if Critical/High
    if (params.adminEmail && params.severity === NotificationSeverity.CRITICAL) {
      await EmailQueueService.enqueueEmailJob({
        recipientEmail: params.adminEmail,
        eventType: params.eventType,
        category: 'OPERATIONAL_ADMIN',
        templateKey: 'ADMIN_CRITICAL_ALERT',
        subject: `CRITICAL ALERT: ${params.title}`,
        templateData: {
          reason: params.message,
          actionUrl: params.actionUrl || '/admin/notifications',
        },
        priority: JobPriority.CRITICAL,
        dedupeKey: params.dedupeKey ? `EMAIL_ADMIN:${params.dedupeKey}` : undefined,
      });

      process.nextTick(() => {
        EmailQueueService.processEmailQueue().catch(() => {});
      });
    }
  }
}
