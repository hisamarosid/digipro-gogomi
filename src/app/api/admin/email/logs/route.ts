import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { EmailQueueService } from '@/services/email/email-queue.service';
import { EmailJobStatus } from '../../../../../../generated/prisma';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status as EmailJobStatus;
    }
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { recipientEmail: { contains: search } },
        { subjectSnapshot: { contains: search } },
      ];
    }

    const [items, total, stats] = await Promise.all([
      db.emailJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.emailJob.count({ where }),
      db.emailJob.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      QUEUED: 0,
      PROCESSING: 0,
      SENT: 0,
      RETRY_SCHEDULED: 0,
      FAILED: 0,
      CANCELLED: 0,
      DEV_CAPTURED: 0,
    };
    stats.forEach((s) => {
      statusCounts[s.status] = s._count.status;
    });

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        statusCounts,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Unauthorized' },
      { status: 401 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { action, jobId } = body;

    if (action === 'RETRY' && jobId) {
      await db.emailJob.update({
        where: { id: jobId },
        data: {
          status: EmailJobStatus.QUEUED,
          nextAttemptAt: new Date(),
          attemptCount: 0,
        },
      });
      // Send right away instead of waiting for the next cron tick.
      process.nextTick(() => {
        EmailQueueService.processEmailQueue().catch(() => {});
      });
      return NextResponse.json({ success: true, message: 'Email job dijadwalkan ulang untuk retry' });
    }

    if (action === 'CANCEL' && jobId) {
      await db.emailJob.update({
        where: { id: jobId },
        data: {
          status: EmailJobStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, message: 'Email job dibatalkan' });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Unauthorized' },
      { status: 401 }
    );
  }
}
