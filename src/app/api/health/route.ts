import { NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';

export async function GET() {
  try {
    // Lightweight database ping check
    await db.$queryRaw`SELECT 1`;

    const currentUsers = await db.user.count().catch(() => 0);

    // Auto-sweep expired pending orders in background
    try {
      const { PaymentService } = await import('@/services/payment.service');
      await PaymentService.sweepExpiredOrders();
    } catch {}

    return NextResponse.json(
      { status: 'ok', database: 'connected', totalUsers: currentUsers, timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { status: 'degraded', database: 'unavailable', error: error.message },
      { status: 503 }
    );
  }
}
