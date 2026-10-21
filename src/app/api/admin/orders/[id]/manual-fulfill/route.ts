import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { AuditService } from '@/services/audit.service';
import { FulfillmentStatus, OrderStatus, SharedSlotStatus, StockStatus, SubscriptionStatus } from '../../../../../../../generated/prisma';
import { InventoryService } from '@/services/inventory.service';
import { SharedAccountService } from '@/services/sharedAccount.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id: orderId } = await params;
    const body = await req.json();

    const {
      orderItemId,
      customPayload,
      inventoryItemId,
      sharedAccountSlotId,
      familyMemberSlotId,
      subscriptionDays,
    } = body;

    if (!orderItemId) {
      return NextResponse.json({ success: false, error: 'orderItemId wajib diisi' }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { variant: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: `Pesanan ${orderId} tidak ditemukan` }, { status: 404 });
    }

    const item = order.items.find((i) => i.id === orderItemId);
    if (!item) {
      return NextResponse.json({ success: false, error: `Item pesanan ${orderItemId} tidak ditemukan dalam order ini` }, { status: 404 });
    }

    const now = new Date();
    const durationDays = subscriptionDays || item.variant?.subscriptionDays || item.variant?.warrantyDays || 30;
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 3600 * 1000);

    let resolvedPayload = (customPayload || '').trim();
    let assignedInventoryItemId: string | null = null;
    let assignedSharedSlotId: string | null = null;
    let assignedFamilySlotId: string | null = null;

    await db.$transaction(async (tx) => {
      // Option A: Manual Inventory Item selection
      if (inventoryItemId) {
        const invItem = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId } });
        if (!invItem) {
          throw new Error('Item stok inventaris tidak ditemukan');
        }
        await tx.inventoryItem.update({
          where: { id: inventoryItemId },
          data: {
            status: StockStatus.ASSIGNED,
            assignedOrderItemId: item.id,
            assignedAt: now,
          },
        });
        assignedInventoryItemId = invItem.id;
        if (!resolvedPayload) {
          resolvedPayload = InventoryService.getPlainPayload(invItem);
        }
      }

      // Option B: Manual Shared Account Slot selection
      if (sharedAccountSlotId) {
        const slot = await tx.sharedAccountSlot.findUnique({
          where: { id: sharedAccountSlotId },
          include: { sharedAccount: true },
        });
        if (!slot) {
          throw new Error('Slot akun bersama tidak ditemukan');
        }
        await tx.sharedAccountSlot.update({
          where: { id: sharedAccountSlotId },
          data: {
            status: SharedSlotStatus.ASSIGNED,
            assignedUserId: order.userId || null,
            orderId: order.id,
            orderItemId: item.id,
            assignedAt: now,
            activatedAt: now,
            expiresAt,
          },
        });
        assignedSharedSlotId = slot.id;
        if (!resolvedPayload && slot.sharedAccount) {
          resolvedPayload = SharedAccountService.getSanitizedCustomerPayload(
            slot.sharedAccount,
            slot,
            item.variant || {}
          );
        }
      }

      // Option C: Manual Family Member Slot selection
      if (familyMemberSlotId) {
        const slot = await tx.familyMemberSlot.findUnique({
          where: { id: familyMemberSlotId },
          include: { familyGroup: true },
        });
        if (!slot) {
          throw new Error('Slot grup keluarga tidak ditemukan');
        }
        await tx.familyMemberSlot.update({
          where: { id: familyMemberSlotId },
          data: {
            status: SharedSlotStatus.ASSIGNED,
            userId: order.userId || null,
            orderId: order.id,
            orderItemId: item.id,
            activatedAt: now,
            expiresAt,
          },
        });
        assignedFamilySlotId = slot.id;
        if (!resolvedPayload && slot.familyGroup) {
          resolvedPayload = `Family Group: ${slot.familyGroup.groupReference}\nInvitation Email: ${item.invitationEmail || 'Assigned by admin'}`;
        }
      }

      if (!resolvedPayload) {
        resolvedPayload = 'Kredensial di-assign secara manual oleh Admin.';
      }

      // Create new active fulfillment record
      await tx.fulfillment.create({
        data: {
          orderItemId: item.id,
          variantId: item.variantId,
          deliveryType: item.deliveryType,
          inventoryItemId: assignedInventoryItemId,
          sharedAccountSlotId: assignedSharedSlotId,
          familyMemberSlotId: assignedFamilySlotId,
          payloadRevealed: resolvedPayload,
          subscriptionExpires: expiresAt,
          status: FulfillmentStatus.ACTIVE,
          deliveredAt: now,
        },
      });

      // Ensure customer subscription record exists or is updated
      if (order.userId) {
        const existingSub = await tx.subscription.findFirst({
          where: { orderItemId: item.id, userId: order.userId },
        });

        if (existingSub) {
          await tx.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: SubscriptionStatus.ACTIVE,
              expiresAt,
            },
          });
        } else {
          await tx.subscription.create({
            data: {
              userId: order.userId,
              orderItemId: item.id,
              variantId: item.variantId,
              status: SubscriptionStatus.ACTIVE,
              expiresAt,
            },
          });
        }
      }

      // Update Order Status to COMPLETED if all items have active fulfillment
      const allItemsFulfillings = await tx.fulfillment.findMany({
        where: {
          orderItem: { orderId: order.id },
          status: { in: [FulfillmentStatus.ACTIVE, FulfillmentStatus.FULFILLED] },
        },
        select: { orderItemId: true },
      });

      const fulfilledItemIds = new Set(allItemsFulfillings.map((f) => f.orderItemId));
      const allFulfilled = order.items.every((i) => fulfilledItemIds.has(i.id));

      if (allFulfilled) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.COMPLETED,
            paymentStatus: 'PAID',
          },
        });
      }
    });

    await AuditService.log({
      actorId: session.userId,
      action: 'ADMIN_MANUAL_FULFILLMENT',
      entity: 'Order',
      entityId: orderId,
      after: { orderItemId, customPayload: resolvedPayload },
    });

    const updatedOrder = await db.order.findUnique({
      where: { id: orderId },
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
      message: 'Fulfillment manual berhasil disimpan dan terkirim ke customer!',
      data: updatedOrder,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
