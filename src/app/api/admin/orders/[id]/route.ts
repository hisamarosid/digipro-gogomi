import { NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';
import { FulfillmentService } from '@/services/fulfillment.service';
import { AuditService } from '@/services/audit.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            variant: { include: { product: true } },
            fulfillments: { orderBy: { createdAt: 'desc' } },
          },
        },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { action, status } = body;

    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    // Action: FULFILL (Retry / Process fulfillment for PAID / NEEDS_FULFILLMENT orders)
    if (action === 'FULFILL') {
      // Mark payment status as PAID if not already marked
      await db.order.update({
        where: { id },
        data: { paymentStatus: 'PAID' },
      });

      const fulfillmentResult = await FulfillmentService.fulfillOrder(id);

      await AuditService.log({
        actorId: session.userId,
        action: 'ADMIN_TRIGGER_FULFILLMENT',
        entity: 'Order',
        entityId: id,
        after: { success: fulfillmentResult.success, outOfStockItems: fulfillmentResult.outOfStockItems },
      });

      const updatedOrder = await db.order.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              variant: { include: { product: true } },
              fulfillments: { orderBy: { createdAt: 'desc' } },
            },
          },
          payments: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: fulfillmentResult.success
          ? 'Fulfillment berhasil! Seluruh lisensi/kredensial telah terkirim ke customer.'
          : `Fulfillment sebagian terproses. Stok habis untuk: ${fulfillmentResult.outOfStockItems.join(', ')}`,
        data: updatedOrder,
      });
    }

    // Action: UPDATE_STATUS (Manual admin status change)
    if (status) {
      const updatedOrder = await db.order.update({
        where: { id },
        data: {
          status,
          ...(status === 'PAID' ? { paymentStatus: 'PAID' } : {}),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              variant: { include: { product: true } },
              fulfillments: { orderBy: { createdAt: 'desc' } },
            },
          },
          payments: true,
        },
      });

      // If status changed to PAID, trigger fulfillment automatically
      if (status === 'PAID') {
        await FulfillmentService.fulfillOrder(id);
      } else if (status === 'COMPLETED') {
        const { LoyaltyService } = await import('@/services/loyalty.service');
        await db.$transaction(async (tx) => {
          await LoyaltyService.awardPurchaseRewardTx(tx, id);
        });
      } else if (status === 'CANCELLED' || status === 'EXPIRED') {
        const { CouponService } = await import('@/services/coupon.service');
        const { LoyaltyService } = await import('@/services/loyalty.service');
        const { ReservationService } = await import('@/services/reservation.service');
        await db.$transaction(async (tx) => {
          await CouponService.revertCouponUsageTx(tx, id);
          await LoyaltyService.releaseReservationTx(tx, id, `ADMIN_ORDER_${status}`);
          await ReservationService.releaseReservationsForOrder(tx, id, `ADMIN_ORDER_${status}`);
        });
      }

      await AuditService.log({
        actorId: session.userId,
        action: 'ADMIN_UPDATE_ORDER_STATUS',
        entity: 'Order',
        entityId: id,
        after: { status },
      });

      return NextResponse.json({
        success: true,
        message: `Status pesanan #${order.orderNumber} berhasil diubah menjadi ${status}!`,
        data: updatedOrder,
      });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
