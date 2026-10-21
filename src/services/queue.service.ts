import { db } from '@/lib/db/prisma';
import {
  DeliveryModel,
  ErrorCategory,
  FulfillmentJobStatus,
  FulfillmentStatus,
  JobPriority,
  OrderStatus,
} from '../../generated/prisma';
import { FulfillmentDiagnosticService, DIAGNOSTIC_CODES } from './diagnostic.service';
import { FulfillmentService } from './fulfillment.service';
import { TelegramService } from './telegram.service';

export class FulfillmentQueueService {
  private static FULFILLMENT_JOB_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Enqueues or reuses an active FulfillmentJob for an OrderItem
   */
  static async enqueueJob(
    tx: any,
    orderId: string,
    orderItemId: string,
    deliveryModel: DeliveryModel,
    userId?: string,
    priority: JobPriority = JobPriority.NORMAL
  ) {
    const existingJob = await tx.fulfillmentJob.findFirst({
      where: {
        orderItemId,
        status: {
          in: [
            FulfillmentJobStatus.QUEUED,
            FulfillmentJobStatus.PROCESSING,
            FulfillmentJobStatus.RETRY_SCHEDULED,
            FulfillmentJobStatus.WAITING_STOCK,
            FulfillmentJobStatus.WAITING_MANUAL,
          ],
        },
      },
    });

    if (existingJob) {
      return existingJob;
    }

    const newJob = await tx.fulfillmentJob.create({
      data: {
        orderId,
        orderItemId,
        userId: userId || undefined,
        deliveryModel,
        status: FulfillmentJobStatus.QUEUED,
        priority,
        attemptCount: 0,
        maxAttempts: 3,
        nextAttemptAt: new Date(),
      },
    });

    return newJob;
  }

  /**
   * Processes a batch of eligible queued/retryable fulfillment jobs
   */
  static async processQueueBatch(batchSize: number = 10): Promise<{ processed: number; succeeded: number; failed: number }> {
    const now = new Date();
    const staleCutoff = new Date(now.getTime() - this.FULFILLMENT_JOB_LOCK_TIMEOUT_MS);

    // Reclaim stale locked jobs if worker crashed
    await db.fulfillmentJob.updateMany({
      where: {
        status: FulfillmentJobStatus.PROCESSING,
        lockedAt: { lte: staleCutoff },
      },
      data: {
        status: FulfillmentJobStatus.RETRY_SCHEDULED,
        lockedAt: null,
        lockedBy: null,
        nextAttemptAt: now,
      },
    });

    // Select eligible jobs
    const jobs = await db.fulfillmentJob.findMany({
      where: {
        status: {
          in: [FulfillmentJobStatus.QUEUED, FulfillmentJobStatus.RETRY_SCHEDULED],
        },
        OR: [
          { nextAttemptAt: null },
          { nextAttemptAt: { lte: now } },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: batchSize,
    });

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    const workerId = `worker-${Math.random().toString(36).slice(2, 8)}`;

    for (const job of jobs) {
      // Lock job atomically
      const locked = await db.fulfillmentJob.updateMany({
        where: {
          id: job.id,
          status: { in: [FulfillmentJobStatus.QUEUED, FulfillmentJobStatus.RETRY_SCHEDULED] },
        },
        data: {
          status: FulfillmentJobStatus.PROCESSING,
          lockedAt: now,
          lockedBy: workerId,
        },
      });

      if (locked.count === 0) {
        continue; // Race condition: job locked by another worker
      }

      processed++;
      const result = await this.executeJob(job.id, workerId);
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    return { processed, succeeded, failed };
  }

  /**
   * Idempotently executes a single FulfillmentJob
   */
  static async executeJob(jobId: string, workerId: string = 'manual-processor'): Promise<{ success: boolean; reason?: string }> {
    const job = await db.fulfillmentJob.findUnique({
      where: { id: jobId },
      include: {
        orderItem: {
          include: { variant: true, order: true },
        },
      },
    });

    if (!job) {
      return { success: false, reason: 'JOB_NOT_FOUND' };
    }

    const currentAttempt = job.attemptCount + 1;
    const startedAt = new Date();

    // 1. Idempotency Check: Verify if OrderItem is already fulfilled
    const existingFulfillment = await db.fulfillment.findFirst({
      where: {
        orderItemId: job.orderItemId,
        status: { in: [FulfillmentStatus.FULFILLED, FulfillmentStatus.ACTIVE] },
      },
    });

    if (existingFulfillment) {
      const now = new Date();
      await db.fulfillmentJob.update({
        where: { id: job.id },
        data: {
          status: FulfillmentJobStatus.COMPLETED,
          completedAt: now,
          lockedAt: null,
          lockedBy: null,
        },
      });

      await db.fulfillmentAttempt.create({
        data: {
          jobId: job.id,
          attemptNumber: currentAttempt,
          status: FulfillmentJobStatus.COMPLETED,
          errorCode: DIAGNOSTIC_CODES.FULFILLMENT_ALREADY_EXISTS,
          errorCategory: ErrorCategory.RETRYABLE,
          diagnosticSnapshot: JSON.stringify({ message: 'Order item already fulfilled' }),
          startedAt,
          finishedAt: now,
        },
      });

      return { success: true };
    }

    // 2. Execute fulfillment strategy inside transaction
    try {
      const result = await db.$transaction(async (tx) => {
        const deliveryModel =
          (job.orderItem.deliveryModelSnapshot as DeliveryModel) ||
          (job.orderItem.variant?.deliveryModel as DeliveryModel) ||
          job.deliveryModel;

        const strategy = (FulfillmentService as any)['strategies'][deliveryModel];
        if (!strategy) {
          throw new Error(`Strategy for ${deliveryModel} not supported`);
        }

        const res = await strategy.execute(tx, {
          orderItemId: job.orderItemId,
          variantId: job.orderItem.variantId,
          userId: job.userId || undefined,
          invitationEmail: job.orderItem.invitationEmail || undefined,
        });

        return res;
      }, { timeout: 20000 });

      const finishedAt = new Date();

      if (result.success) {
        // Success Path
        await db.fulfillmentJob.update({
          where: { id: job.id },
          data: {
            status: FulfillmentJobStatus.COMPLETED,
            completedAt: finishedAt,
            attemptCount: currentAttempt,
            lastAttemptAt: finishedAt,
            lockedAt: null,
            lockedBy: null,
          },
        });

        await db.fulfillmentAttempt.create({
          data: {
            jobId: job.id,
            attemptNumber: currentAttempt,
            status: FulfillmentJobStatus.COMPLETED,
            diagnosticSnapshot: JSON.stringify({ message: 'Fulfillment completed successfully' }),
            startedAt,
            finishedAt,
          },
        });

        // Update overall order status
        await this.updateOrderStatusAfterFulfillment(job.orderId);

        return { success: true };
      } else {
        // Business Fulfillment Failure (e.g. No stock available)
        const diagnostic = await FulfillmentDiagnosticService.diagnoseVariantFulfillment(job.orderItem.variantId);
        const category = diagnostic.category;
        const errorCode = diagnostic.code || DIAGNOSTIC_CODES.NO_AVAILABLE_INVENTORY;

        return await this.handleJobFailure(job, currentAttempt, startedAt, finishedAt, errorCode, category, diagnostic.message, diagnostic);
      }
    } catch (error: any) {
      // Technical Exception
      const finishedAt = new Date();
      const diagnostic = await FulfillmentDiagnosticService.diagnoseVariantFulfillment(job.orderItem.variantId);
      const category = FulfillmentDiagnosticService.classifyErrorCategory(diagnostic.code);

      return await this.handleJobFailure(
        job,
        currentAttempt,
        startedAt,
        finishedAt,
        diagnostic.code || DIAGNOSTIC_CODES.ALLOCATION_FAILED,
        category,
        error.message || 'System exception during fulfillment execution',
        diagnostic
      );
    }
  }

  /**
   * Internal helper to handle job failure classification and backoff delay
   */
  private static async handleJobFailure(
    job: any,
    attemptNumber: number,
    startedAt: Date,
    finishedAt: Date,
    errorCode: string,
    category: ErrorCategory,
    errorMessage: string,
    diagnostic: any
  ): Promise<{ success: boolean; reason: string }> {
    let nextStatus: FulfillmentJobStatus = FulfillmentJobStatus.RETRY_SCHEDULED;
    let nextAttemptAt: Date | null = null;

    // Backoff Delays: Attempt 1 (+30s), Attempt 2 (+120s), Attempt 3 (+300s)
    const backoffSeconds = attemptNumber === 1 ? 30 : attemptNumber === 2 ? 120 : 300;

    if (category === ErrorCategory.WAITING_RESOURCE) {
      nextStatus = FulfillmentJobStatus.WAITING_STOCK;
      nextAttemptAt = null; // Retry on stock add or manual trigger
    } else if (category === ErrorCategory.MANUAL_REQUIRED) {
      nextStatus = FulfillmentJobStatus.WAITING_MANUAL;
      nextAttemptAt = null;
    } else if (category === ErrorCategory.PERMANENT || attemptNumber >= job.maxAttempts) {
      nextStatus = FulfillmentJobStatus.FAILED;
      nextAttemptAt = null;
    } else {
      nextStatus = FulfillmentJobStatus.RETRY_SCHEDULED;
      nextAttemptAt = new Date(finishedAt.getTime() + backoffSeconds * 1000);
    }

    const safeSnapshot = FulfillmentDiagnosticService.sanitizeDiagnosticSnapshot({
      errorCode,
      category,
      message: errorMessage,
      diagnostics: diagnostic,
    });

    await db.fulfillmentJob.update({
      where: { id: job.id },
      data: {
        status: nextStatus,
        attemptCount: attemptNumber,
        lastAttemptAt: finishedAt,
        nextAttemptAt,
        lastErrorCode: errorCode,
        lastErrorMessage: errorMessage,
        lockedAt: null,
        lockedBy: null,
      },
    });

    await db.fulfillmentAttempt.create({
      data: {
        jobId: job.id,
        attemptNumber,
        status: nextStatus,
        errorCode,
        errorCategory: category,
        diagnosticSnapshot: safeSnapshot,
        startedAt,
        finishedAt,
      },
    });

    // Update overall order status to NEEDS_FULFILLMENT if unfulfilled
    await db.order.update({
      where: { id: job.orderId },
      data: { status: OrderStatus.NEEDS_FULFILLMENT },
    });

    // Telegram Alerts for Operations
    if (nextStatus === FulfillmentJobStatus.WAITING_STOCK) {
      TelegramService.sendFulfillmentWaitingStockNotification({
        orderId: job.orderId,
        orderNumber: job.order?.orderNumber || job.orderId,
        productName: job.orderItem?.productName || 'Produk Digital',
        variantName: job.orderItem?.variantName,
        issue: errorMessage || errorCode,
      }).catch(() => {});
    } else if (nextStatus === FulfillmentJobStatus.FAILED) {
      TelegramService.sendFulfillmentFailedNotification({
        orderId: job.orderId,
        orderNumber: job.order?.orderNumber || job.orderId,
        productName: job.orderItem?.productName || 'Produk Digital',
        reason: errorMessage || errorCode,
      }).catch(() => {});
    }

    return { success: false, reason: errorCode };
  }

  /**
   * Updates overall order status after item fulfillment
   */
  private static async updateOrderStatusAfterFulfillment(orderId: string) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { fulfillments: true } } },
    });

    if (!order) return;

    const allItemsFulfilled = order.items.every((item) =>
      item.fulfillments.some((f) => f.status === FulfillmentStatus.FULFILLED || f.status === FulfillmentStatus.ACTIVE)
    );

    if (allItemsFulfilled) {
      await db.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.COMPLETED },
      });
    } else {
      const anyItemFulfilled = order.items.some((item) =>
        item.fulfillments.some((f) => f.status === FulfillmentStatus.FULFILLED || f.status === FulfillmentStatus.ACTIVE)
      );

      if (anyItemFulfilled) {
        await db.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.NEEDS_FULFILLMENT },
        });
      }
    }
  }
}
