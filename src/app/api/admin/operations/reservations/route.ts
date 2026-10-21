import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { getCurrentSession } from '@/lib/auth/session';
import { ReservationService } from '@/services/reservation.service';
import { ReservationStatus } from '../../../../../../generated/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role === 'CUSTOMER') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as ReservationStatus | null;
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(50, Math.max(10, Number(searchParams.get('limit')) || 20));

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [reservations, total] = await Promise.all([
      db.resourceReservation.findMany({
        where,
        include: {
          order: { select: { id: true, orderNumber: true, status: true, paymentStatus: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.resourceReservation.count({ where }),
    ]);

    const activeCount = await db.resourceReservation.count({ where: { status: ReservationStatus.ACTIVE } });
    const consumedCount = await db.resourceReservation.count({ where: { status: ReservationStatus.CONSUMED } });
    const releasedCount = await db.resourceReservation.count({ where: { status: ReservationStatus.RELEASED } });
    const expiredCount = await db.resourceReservation.count({ where: { status: ReservationStatus.EXPIRED } });

    // Check for stale reservations (ACTIVE but expiresAt < now)
    const staleCount = await db.resourceReservation.count({
      where: {
        status: ReservationStatus.ACTIVE,
        expiresAt: { lte: new Date() },
      },
    });

    return NextResponse.json({
      success: true,
      data: reservations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        activeCount,
        consumedCount,
        releasedCount,
        expiredCount,
        staleCount,
      },
    });
  } catch (error: any) {
    console.error('[Admin Operations Reservations API Error]:', error);
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
    const { action, reservationId, orderId } = body;

    if (action === 'CLEANUP_EXPIRED') {
      const result = await ReservationService.releaseExpiredReservations();
      return NextResponse.json({ success: true, result });
    }

    if (action === 'FORCE_RELEASE' && orderId) {
      const releasedCount = await db.$transaction(async (tx) => {
        return await ReservationService.releaseReservationsForOrder(tx, orderId, `MANUAL_ADMIN_RELEASE_BY_${session.name}`);
      });
      return NextResponse.json({ success: true, releasedCount });
    }

    return NextResponse.json({ success: false, error: 'INVALID_ACTION' }, { status: 400 });
  } catch (error: any) {
    console.error('[Admin Operations Reservations Action Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
