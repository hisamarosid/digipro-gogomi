import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { OrderService } from '@/services/order.service';
import { PaymentService } from '@/services/payment.service';
import { LoyaltyService } from '@/services/loyalty.service';
import { ReservationService } from '@/services/reservation.service';
import { FulfillmentQueueService } from '@/services/queue.service';
import { FulfillmentService } from '@/services/fulfillment.service';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { buildOrderAccessPath } from '@/lib/utils/order-link';
import { NotificationOrchestrator } from '@/services/email/email-orchestrator';
import { CustomerNotificationCategory, OrderStatus, PaymentStatus } from '../../../../../generated/prisma';

export async function POST(req: NextRequest) {
  try {
    // Rate limit checkout calls per IP
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`checkout_${ip}`, 10, 60000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak permintaan checkout. Silakan coba sebentar lagi.' },
        { status: 429 }
      );
    }

    const session = await getCurrentSession();
    const body = await req.json();

    // Auto-sweep any old pending expired orders to free up stock & coins
    await PaymentService.sweepExpiredOrders().catch(() => {});

    const order = await OrderService.createOrder({
      userId: session?.userId,
      guestEmail: body.guestEmail,
      guestName: body.guestName,
      guestPhone: body.guestPhone,
      couponCode: body.couponCode,
      requestedCoins: body.requestedCoins ? Number(body.requestedCoins) : 0,
      items: body.items,
    });

    let paymentData = null;
    const cashPayable = order.cashPayableAmount !== undefined ? order.cashPayableAmount : order.grandTotal;

    // Handle 100% Coin Payment vs QRIS Payment
    if (cashPayable === 0) {
      await db.$transaction(async (tx) => {
        // 1. Permanently consume coin & resource reservations
        await LoyaltyService.consumeReservationTx(tx, order.id);
        await ReservationService.consumeReservationsForOrder(tx, order.id);

        // 2. Create STORE_COIN payment record with status PAID
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: 0,
            provider: 'STORE_COIN',
            status: PaymentStatus.PAID,
            transactionTime: new Date(),
          },
        });

        // 3. Mark Order as PAID
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            paymentStatus: PaymentStatus.PAID,
          },
          include: { items: { include: { variant: true } } },
        });

        // 4. Enqueue fulfillment jobs & update product sold count
        for (const item of updatedOrder.items) {
          const deliveryModel = (item.deliveryModelSnapshot as any) || (item.variant?.deliveryModel as any) || 'DEDICATED_ACCOUNT';
          await FulfillmentQueueService.enqueueJob(tx, order.id, item.id, deliveryModel, updatedOrder.userId || undefined);

          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { productId: true },
          });
          if (variant) {
            await tx.product.update({
              where: { id: variant.productId },
              data: { soldCount: { increment: item.quantity } },
            });
          }
        }
      });

      // Execute fulfillment queue for 100% coin paid order
      await FulfillmentQueueService.processQueueBatch(10);
      await FulfillmentService.fulfillOrder(order.id);
    } else {
      const payment = await PaymentService.generateOrderQRIS(order.id);
      paymentData = {
        qrString: payment.qrString,
        qrUrl: payment.qrUrl,
        expiryTime: payment.expiryTime,
      };
    }

    // Dispatch ORDER_CREATED Event via NotificationOrchestrator
    const targetEmail = session?.email || body.guestEmail;
    if (targetEmail) {
      try {
        const items = order.items || [];
        const firstItem = items[0];
        const productName = items.length > 1
          ? `${firstItem?.productName || 'Produk'} (+${items.length - 1} item lainnya)`
          : firstItem?.productName || 'Produk Digital';
        const variantName = items.length > 1
          ? items.map((i: any) => i.variantName).filter(Boolean).join(', ')
          : firstItem?.variantName || '-';

        await NotificationOrchestrator.dispatchEvent({
          userId: session?.userId || null,
          userEmail: targetEmail,
          eventType: 'ORDER_CREATED',
          title: `Pesanan #${order.orderNumber} Berhasil Dibuat`,
          message: cashPayable === 0
            ? `Pesanan #${order.orderNumber} berhasil dibayar 100% dengan Store Coins!`
            : `Pesanan #${order.orderNumber} berhasil dibuat. Silakan selesaikan pembayaran QRIS.`,
          actionUrl: cashPayable === 0 ? buildOrderAccessPath(order.orderNumber, order.guestToken) : `/payment/${order.orderNumber}`,
          emailTemplateKey: 'ORDER_CREATED',
          emailCategory: 'TRANSACTIONAL',
          metadata: {
            customerName: session?.name || body.guestName || 'Customer',
            orderNumber: order.orderNumber,
            productName,
            variantName,
            amount: order.grandTotal,
            category: CustomerNotificationCategory.ORDER,
          },
          dedupeKey: `ORDER_CREATED:${order.id}`,
        });
      } catch (err: any) {
        console.error('[Checkout] Notification Event Error:', err?.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        guestToken: order.guestToken,
        grandTotal: order.grandTotal,
        cashPayableAmount: cashPayable,
        coinUsed: order.coinUsed || 0,
        isFullCoinPayment: cashPayable === 0,
        payment: paymentData,
      },
    });
  } catch (err: any) {
    console.error('[Checkout API Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memproses checkout' },
      { status: 400 }
    );
  }
}
