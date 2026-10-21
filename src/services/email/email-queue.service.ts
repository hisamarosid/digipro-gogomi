import { db } from '@/lib/db/prisma';
import { EnqueueEmailJobInput } from './email-types';
import { EmailPreferenceService } from './email-preference.service';
import { EmailTemplates } from './email-templates';
import { EmailProviderService } from './email-provider.service';
import { EmailJobStatus, JobPriority } from '../../../generated/prisma';

export class EmailQueueService {
  /**
   * Enqueues an EmailJob asynchronously (Idempotent via dedupeKey)
   */
  public static async enqueueEmailJob(input: EnqueueEmailJobInput) {
    try {
      // 1. Check Preference
      const isEnabled = await EmailPreferenceService.isEmailCategoryEnabled(
        input.recipientUserId,
        input.category,
        input.templateKey
      );

      if (!isEnabled) {
        return null;
      }

      // 2. Deduplication check
      if (input.dedupeKey) {
        const existing = await db.emailJob.findUnique({
          where: { dedupeKey: input.dedupeKey },
        });

        if (existing) {
          return existing;
        }
      }

      // 3. Create Email Job
      const settings = await EmailProviderService.getGlobalEmailSettings();
      let originalEmail = input.recipientEmail;
      let targetEmail = input.recipientEmail;

      if (settings.mode === 'development' && settings.devStrategy === 'redirect' && settings.devRedirectTo) {
        targetEmail = settings.devRedirectTo;
      }

      const job = await db.emailJob.create({
        data: {
          recipientUserId: input.recipientUserId || null,
          recipientEmail: targetEmail,
          originalRecipientEmail: originalEmail,
          eventType: input.eventType,
          category: input.category,
          templateKey: input.templateKey,
          subjectSnapshot: input.subject,
          templateData: input.templateData ? JSON.stringify(input.templateData) : null,
          entityType: input.entityType || null,
          entityId: input.entityId || null,
          priority: input.priority || JobPriority.NORMAL,
          status: EmailJobStatus.QUEUED,
          dedupeKey: input.dedupeKey || null,
        },
      });

      return job;
    } catch (err: any) {
      // Log error silently so core business transaction never fails
      console.error('[EmailQueueService] Enqueue Error:', err?.message);
      return null;
    }
  }

  /**
   * Worker processor: fetches QUEUED / RETRY_SCHEDULED jobs and processes them
   */
  public static async processEmailQueue(batchSize: number = 10) {
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // 1. Fetch eligible jobs (including stale PROCESSING jobs whose lock expired)
    const jobs = await db.emailJob.findMany({
      where: {
        OR: [
          { status: { in: [EmailJobStatus.QUEUED, EmailJobStatus.RETRY_SCHEDULED] } },
          { status: EmailJobStatus.PROCESSING, lockedAt: { lte: fiveMinutesAgo } },
        ],
        AND: [
          { OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
          { OR: [{ lockedAt: null }, { lockedAt: { lte: fiveMinutesAgo } }] },
        ],
      },
      take: batchSize,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    let processedCount = 0;

    for (const job of jobs) {
      try {
        // Atomic DB Lock
        await db.emailJob.update({
          where: { id: job.id },
          data: {
            status: EmailJobStatus.PROCESSING,
            lockedAt: now,
            lockedBy: workerId,
            attemptCount: { increment: 1 },
            lastAttemptAt: now,
          },
        });

        // Parse Safe Metadata
        let templateData = {};
        if (job.templateData) {
          try {
            templateData = JSON.parse(job.templateData);
          } catch {
            templateData = {};
          }
        }

        // Render Template
        const renderResult = EmailTemplates.renderTemplate(job.templateKey, templateData);

        // Dispatch Email via Provider
        const sendResult = await EmailProviderService.sendEmail({
          recipientEmail: job.recipientEmail,
          subject: renderResult.subject,
          html: renderResult.html,
          text: renderResult.text,
        });

        if (sendResult.success) {
          const finalStatus = sendResult.isDevCaptured
            ? EmailJobStatus.DEV_CAPTURED
            : EmailJobStatus.SENT;

          await db.emailJob.update({
            where: { id: job.id },
            data: {
              status: finalStatus,
              sentAt: new Date(),
              providerMessageId: sendResult.providerMessageId || null,
              lockedAt: null,
              lockedBy: null,
            },
          });
          processedCount++;
        } else {
          // Retry policy with backoff
          const attempts = job.attemptCount + 1;
          const maxAttempts = job.maxAttempts || 5;

          if (attempts >= maxAttempts) {
            await db.emailJob.update({
              where: { id: job.id },
              data: {
                status: EmailJobStatus.FAILED,
                failedAt: new Date(),
                lastErrorCode: sendResult.errorCode || 'MAX_ATTEMPTS_REACHED',
                lastErrorMessageSafe: sendResult.errorMessageSafe || 'Batas maksimum retry tercapai',
                lockedAt: null,
                lockedBy: null,
              },
            });
          } else {
            // Backoff intervals: 1m, 5m, 15m, 1h, 6h
            const backoffMinutes = [1, 5, 15, 60, 360][Math.min(attempts - 1, 4)];
            const nextAttemptAt = new Date(now.getTime() + backoffMinutes * 60 * 1000);

            await db.emailJob.update({
              where: { id: job.id },
              data: {
                status: EmailJobStatus.RETRY_SCHEDULED,
                nextAttemptAt,
                lastErrorCode: sendResult.errorCode || 'DISPATCH_ERROR',
                lastErrorMessageSafe: sendResult.errorMessageSafe || 'Gagal mengirim email',
                lockedAt: null,
                lockedBy: null,
              },
            });
          }
        }
      } catch (err: any) {
        console.error(`[EmailQueueWorker] Error processing job ${job.id}:`, err?.message);
        await db.emailJob.update({
          where: { id: job.id },
          data: {
            status: EmailJobStatus.RETRY_SCHEDULED,
            nextAttemptAt: new Date(now.getTime() + 60 * 1000),
            lastErrorCode: 'UNHANDLED_WORKER_EXCEPTION',
            lastErrorMessageSafe: err?.message || 'Terjadi kesalahan internal saat pengiriman email',
            lockedAt: null,
            lockedBy: null,
          },
        }).catch(() => {});
      }
    }

    return processedCount;
  }

  /**
   * Cancels obsolete queued reminders (e.g. when subscription is renewed)
   */
  public static async cancelObsoleteReminders(entityType: string, entityId: string) {
    try {
      await db.emailJob.updateMany({
        where: {
          entityType,
          entityId,
          status: { in: [EmailJobStatus.QUEUED, EmailJobStatus.RETRY_SCHEDULED] },
        },
        data: {
          status: EmailJobStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });
    } catch (err: any) {
      console.error('[EmailQueueService] Cancel Obsolete Reminders Error:', err?.message);
    }
  }
}
