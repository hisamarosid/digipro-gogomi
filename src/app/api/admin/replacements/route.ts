import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { ReplacementStatus } from '../../../../../generated/prisma';
import { formatRevealedPayload } from '@/lib/security/encryption';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as ReplacementStatus | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { requestNumber: { contains: search } },
        { order: { orderNumber: { contains: search } } },
        { user: { email: { contains: search } } },
        { user: { name: { contains: search } } },
      ];
    }

    const [rawItems, total] = await Promise.all([
      db.replacementRequest.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          order: { select: { orderNumber: true } },
          product: { select: { name: true } },
          variant: { select: { name: true, sku: true } },
          previousFulfillment: { select: { payloadRevealed: true } },
          newFulfillment: { select: { payloadRevealed: true } },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      db.replacementRequest.count({ where }),
    ]);

    const items = rawItems.map((item: any) => ({
      ...item,
      previousFulfillment: item.previousFulfillment
        ? {
            ...item.previousFulfillment,
            payloadRevealed: item.previousFulfillment.payloadRevealed
              ? formatRevealedPayload(item.previousFulfillment.payloadRevealed)
              : item.previousFulfillment.payloadRevealed,
          }
        : item.previousFulfillment,
      newFulfillment: item.newFulfillment
        ? {
            ...item.newFulfillment,
            payloadRevealed: item.newFulfillment.payloadRevealed
              ? formatRevealedPayload(item.newFulfillment.payloadRevealed)
              : item.newFulfillment.payloadRevealed,
          }
        : item.newFulfillment,
    }));

    // Metrics summary
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayCount, pendingCount, waitingStockCount, completedCount, failedCount] = await Promise.all([
      db.replacementRequest.count({ where: { requestedAt: { gte: todayStart } } }),
      db.replacementRequest.count({ where: { status: ReplacementStatus.PENDING } }),
      db.replacementRequest.count({ where: { status: ReplacementStatus.WAITING_STOCK } }),
      db.replacementRequest.count({ where: { status: ReplacementStatus.COMPLETED } }),
      db.replacementRequest.count({ where: { status: ReplacementStatus.FAILED } }),
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      metrics: {
        todayCount,
        pendingCount,
        waitingStockCount,
        completedCount,
        failedCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'INTERNAL_ERROR' }, { status: 500 });
  }
}
