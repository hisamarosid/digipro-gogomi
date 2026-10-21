import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { getCurrentSession } from '@/lib/auth/session';
import { FulfillmentQueueService } from '@/services/queue.service';
import { FulfillmentJobStatus, JobPriority } from '../../../../../../generated/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role === 'CUSTOMER') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as FulfillmentJobStatus | null;
    const search = searchParams.get('search') || '';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(50, Math.max(10, Number(searchParams.get('limit')) || 20));

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { order: { orderNumber: { contains: search } } },
        { orderItem: { productName: { contains: search } } },
      ];
    }

    const [jobs, total] = await Promise.all([
      db.fulfillmentJob.findMany({
        where,
        include: {
          order: { select: { id: true, orderNumber: true, guestEmail: true, user: { select: { name: true, email: true } } } },
          orderItem: { select: { id: true, productName: true, variantName: true, sku: true, unitPrice: true, deliveryModelSnapshot: true } },
          attempts: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.fulfillmentJob.count({ where }),
    ]);

    // Fetch summary statistics
    const [queuedCount, processingCount, waitingStockCount, waitingManualCount, retryScheduledCount, failedCount, completedCount] =
      await Promise.all([
        db.fulfillmentJob.count({ where: { status: FulfillmentJobStatus.QUEUED } }),
        db.fulfillmentJob.count({ where: { status: FulfillmentJobStatus.PROCESSING } }),
        db.fulfillmentJob.count({ where: { status: FulfillmentJobStatus.WAITING_STOCK } }),
        db.fulfillmentJob.count({ where: { status: FulfillmentJobStatus.WAITING_MANUAL } }),
        db.fulfillmentJob.count({ where: { status: FulfillmentJobStatus.RETRY_SCHEDULED } }),
        db.fulfillmentJob.count({ where: { status: FulfillmentJobStatus.FAILED } }),
        db.fulfillmentJob.count({ where: { status: FulfillmentJobStatus.COMPLETED } }),
      ]);

    return NextResponse.json({
      success: true,
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        queuedCount,
        processingCount,
        waitingStockCount,
        waitingManualCount,
        retryScheduledCount,
        failedCount,
        completedCount,
      },
    });
  } catch (error: any) {
    console.error('[Admin Operations Fulfillment API Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role === 'CUSTOMER') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await req.json();
    const { action, jobId, batchRetryWaitingStock, priority } = body;

    if (action === 'RETRY_JOB' && jobId) {
      const job = await db.fulfillmentJob.findUnique({ where: { id: jobId } });
      if (!job) {
        return NextResponse.json({ success: false, error: 'JOB_NOT_FOUND' }, { status: 404 });
      }

      await db.fulfillmentJob.update({
        where: { id: jobId },
        data: {
          status: FulfillmentJobStatus.QUEUED,
          nextAttemptAt: new Date(),
          priority: priority || JobPriority.HIGH,
        },
      });

      const res = await FulfillmentQueueService.executeJob(jobId, `admin-${session.name}`);
      return NextResponse.json({ success: true, result: res });
    }

    if (batchRetryWaitingStock) {
      // Re-queue WAITING_STOCK jobs that now have stock available
      const waitingJobs = await db.fulfillmentJob.findMany({
        where: { status: FulfillmentJobStatus.WAITING_STOCK },
        take: 20,
      });

      for (const j of waitingJobs) {
        await db.fulfillmentJob.update({
          where: { id: j.id },
          data: {
            status: FulfillmentJobStatus.QUEUED,
            nextAttemptAt: new Date(),
          },
        });
      }

      const res = await FulfillmentQueueService.processQueueBatch(20);
      return NextResponse.json({ success: true, message: `Re-queued ${waitingJobs.length} waiting jobs`, batchResult: res });
    }

    // Default trigger process queue
    const result = await FulfillmentQueueService.processQueueBatch(10);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('[Admin Operations Queue Action Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
