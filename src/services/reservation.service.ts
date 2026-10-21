import { db } from '@/lib/db/prisma';
import { OrderStatus, ReservationStatus, ReservationType, SharedSlotStatus, StockStatus } from '../../generated/prisma';
import { PaymentService } from './payment.service';

export class ReservationService {
  /**
   * Creates a new resource reservation aligned with checkout QRIS expiration
   */
  static async createReservation(
    tx: any,
    type: ReservationType,
    resourceId: string,
    userId: string | null,
    orderId: string,
    orderItemId: string | null,
    expiresAt: Date
  ) {
    // Ensure no existing active reservation for the exact same resource & order
    const existing = await tx.resourceReservation.findFirst({
      where: {
        resourceId,
        orderId,
        status: ReservationStatus.ACTIVE,
      },
    });

    if (existing) {
      return existing;
    }

    const reservation = await tx.resourceReservation.create({
      data: {
        type,
        resourceId,
        userId: userId || undefined,
        orderId,
        orderItemId: orderItemId || undefined,
        status: ReservationStatus.ACTIVE,
        expiresAt,
      },
    });

    // Mark underlying resource as RESERVED if applicable
    if (type === ReservationType.SHARED_SLOT_RESERVATION) {
      await tx.sharedAccountSlot.updateMany({
        where: { id: resourceId, status: SharedSlotStatus.AVAILABLE },
        data: { status: SharedSlotStatus.RESERVED },
      });
    } else if (type === ReservationType.FAMILY_SLOT_RESERVATION) {
      await tx.familyMemberSlot.updateMany({
        where: { id: resourceId, status: SharedSlotStatus.AVAILABLE },
        data: { status: SharedSlotStatus.RESERVED },
      });
    } else if (type === ReservationType.INVENTORY_RESERVATION) {
      await tx.inventoryItem.updateMany({
        where: { id: resourceId, status: 'AVAILABLE' },
        data: { status: 'RESERVED' },
      });
    }

    return reservation;
  }

  /**
   * Consumes active reservations upon payment settlement (PAID)
   */
  static async consumeReservationsForOrder(tx: any, orderId: string) {
    const activeReservations = await tx.resourceReservation.findMany({
      where: {
        orderId,
        status: ReservationStatus.ACTIVE,
      },
    });

    for (const res of activeReservations) {
      await tx.resourceReservation.update({
        where: { id: res.id },
        data: {
          status: ReservationStatus.CONSUMED,
          consumedAt: new Date(),
        },
      });
    }

    return activeReservations.length;
  }

  /**
   * Releases active reservations back to AVAILABLE when payment expires or is cancelled
   */
  static async releaseReservationsForOrder(tx: any, orderId: string, reason: string = 'PAYMENT_EXPIRED_OR_CANCELLED') {
    const activeReservations = await tx.resourceReservation.findMany({
      where: {
        orderId,
        status: ReservationStatus.ACTIVE,
      },
    });

    for (const res of activeReservations) {
      await tx.resourceReservation.update({
        where: { id: res.id },
        data: {
          status: ReservationStatus.RELEASED,
          releasedAt: new Date(),
          releaseReason: reason,
        },
      });

      // Restore resource status back to AVAILABLE if not assigned
      if (res.type === ReservationType.SHARED_SLOT_RESERVATION) {
        await tx.sharedAccountSlot.updateMany({
          where: { id: res.resourceId, status: SharedSlotStatus.RESERVED },
          data: { status: SharedSlotStatus.AVAILABLE },
        });
      } else if (res.type === ReservationType.FAMILY_SLOT_RESERVATION) {
        await tx.familyMemberSlot.updateMany({
          where: { id: res.resourceId, status: SharedSlotStatus.RESERVED },
          data: { status: SharedSlotStatus.AVAILABLE },
        });
      } else if (res.type === ReservationType.INVENTORY_RESERVATION) {
        await tx.inventoryItem.updateMany({
          where: { id: res.resourceId, status: 'RESERVED' },
          data: { status: 'AVAILABLE' },
        });
      } else if (res.type === ReservationType.COIN_RESERVATION && res.userId) {
        await tx.user.updateMany({
          where: { id: res.userId },
          data: { disabled: false },
        });
      }
    }

    return activeReservations.length;
  }

  /**
   * Scheduled & Lazy cleanup for expired reservations past expiresAt
   */
  static async releaseExpiredReservations(): Promise<{ releasedCount: number }> {
    const now = new Date();
    let releasedCount = 0;

    // 1. Find all PENDING_PAYMENT orders created > 15 minutes ago
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const staleOrders = await db.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        createdAt: { lte: fifteenMinsAgo },
      },
      select: { id: true, orderNumber: true },
      take: 100,
    });

    for (const order of staleOrders) {
      try {
        await PaymentService.expireOrder(order.id, 'EXPIRED_CRON_TIMEOUT');
        releasedCount++;
      } catch (err) {
        console.error(`[ReservationService] Failed to expire order ${order.orderNumber}:`, err);
      }
    }

    // 2. Cleanup orphaned active resource reservations
    const expiredActive = await db.resourceReservation.findMany({
      where: {
        status: ReservationStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      take: 100,
    });

    for (const res of expiredActive) {
      await db.$transaction(async (tx) => {
        const current = await tx.resourceReservation.findUnique({
          where: { id: res.id },
        });

        if (current && current.status === ReservationStatus.ACTIVE) {
          await tx.resourceReservation.update({
            where: { id: res.id },
            data: {
              status: ReservationStatus.EXPIRED,
              releasedAt: now,
              releaseReason: 'EXPIRED_TIMEOUT_CLEANUP',
            },
          });

          // Restore slots / resources
          if (res.type === ReservationType.SHARED_SLOT_RESERVATION) {
            await tx.sharedAccountSlot.updateMany({
              where: { id: res.resourceId, status: SharedSlotStatus.RESERVED },
              data: { status: SharedSlotStatus.AVAILABLE },
            });
          } else if (res.type === ReservationType.FAMILY_SLOT_RESERVATION) {
            await tx.familyMemberSlot.updateMany({
              where: { id: res.resourceId, status: SharedSlotStatus.RESERVED },
              data: { status: SharedSlotStatus.AVAILABLE },
            });
          } else if (res.type === ReservationType.INVENTORY_RESERVATION) {
            await tx.inventoryItem.updateMany({
              where: { id: res.resourceId, status: 'RESERVED' },
              data: { status: 'AVAILABLE' },
            });
          }

          releasedCount++;
        }
      });
    }

    return { releasedCount };
  }
}
