import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { FulfillmentService } from '@/services/fulfillment.service';
import { SharedStockService } from '@/services/sharedStock.service';
import { AuditService } from '@/services/audit.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { variant: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: `Order ${id} tidak ditemukan` }, { status: 404 });
    }

    const isPaidOrCompleted =
      order.paymentStatus === 'PAID' ||
      ['PAID', 'NEEDS_FULFILLMENT', 'PROCESSING', 'COMPLETED'].includes(order.status);

    if (!isPaidOrCompleted) {
      return NextResponse.json(
        { success: false, error: 'Hanya pesanan yang sudah dibayar yang dapat dilakukan proses / retry fulfillment.' },
        { status: 400 }
      );
    }

    await AuditService.log({
      actorId: session.userId,
      action: 'FULFILLMENT_RETRY_REQUESTED',
      entity: 'Order',
      entityId: id,
    });

    const result = await FulfillmentService.fulfillOrder(id);

    // Fetch updated order
    const updatedOrder = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            fulfillments: true,
            variant: true,
          },
        },
      },
    });

    if (result.success) {
      await AuditService.log({
        actorId: session.userId,
        action: 'FULFILLMENT_RETRY_SUCCESS',
        entity: 'Order',
        entityId: id,
      });

      return NextResponse.json({
        success: true,
        message: 'Retry fulfillment berhasil! Seluruh produk dalam order telah di-fulfill.',
        data: updatedOrder,
      });
    } else {
      // Diagnostic failure reasons per item
      const itemDiagnostics = [];
      for (const item of updatedOrder?.items || []) {
        if (item.variant?.deliveryModel === 'SHARED_ACCOUNT') {
          const diag = await SharedStockService.getSharedInventoryDiagnostics(item.variantId);
          itemDiagnostics.push({
            orderItemId: item.id,
            productName: item.productName,
            variantName: item.variantName,
            failureReason: diag.primaryFailureReason || 'NO_AVAILABLE_SLOT',
            diagnostic: diag,
          });
        }
      }

      await AuditService.log({
        actorId: session.userId,
        action: 'FULFILLMENT_RETRY_FAILED',
        entity: 'Order',
        entityId: id,
        after: JSON.stringify({ outOfStockItems: result.outOfStockItems }),
      });

      return NextResponse.json({
        success: false,
        message: `Retry fulfillment selesai dengan sebagian item tertunda: ${result.outOfStockItems.join(', ')}`,
        data: {
          order: updatedOrder,
          outOfStockItems: result.outOfStockItems,
          itemDiagnostics,
        },
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
