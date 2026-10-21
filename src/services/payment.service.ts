import { db } from '@/lib/db/prisma';
import { autoGoPay } from '@/lib/autogopay';
import { convertStaticQRIStoDynamic, GOGO_GAMING_STATIC_QR } from '@/lib/qris/emvco';
import { FulfillmentService } from './fulfillment.service';
import { LoyaltyService } from './loyalty.service';
import { ReservationService } from './reservation.service';
import { CouponService } from './coupon.service';
import { FulfillmentQueueService } from './queue.service';
import { DomainEventService } from './domainEvent.service';
import { TelegramService } from './telegram.service';
import { OrderStatus, PaymentStatus } from '../../generated/prisma';
import crypto from 'crypto';

const ALREADY_PAID_RACE = 'ALREADY_PAID_RACE';

/** Stable identifier for a gateway mutation, used to make sure one mutation settles at most one order. */
function getMutationKey(tx: any): string {
  if (tx?.id !== undefined && tx?.id !== null && String(tx.id).trim() !== '') return String(tx.id).trim();
  return `MUT-${tx?.time || ''}-${Math.round(Number(tx?.amount))}-${tx?.issuer || ''}`;
}

export class PaymentService {
  /**
   * Generates AutoGoPay QRIS payment for an existing PENDING_PAYMENT order.
   * Prioritizes dynamic AutoGoPay gateway; automatically falls back to Gogo Gaming Static QRIS + Unique Code.
   */
  static async generateOrderQRIS(orderId: string) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status === OrderStatus.PAID || order.status === OrderStatus.COMPLETED) {
      throw new Error('Order is already paid');
    }

    // Reuse existing unexpired pending payment if available
    if (order.payments && order.payments.length > 0) {
      const existingPayment = order.payments[0];
      const expiry = existingPayment.expiryTime ? new Date(existingPayment.expiryTime).getTime() : 0;
      if (existingPayment.status === PaymentStatus.PENDING && existingPayment.qrString && expiry > Date.now()) {
        return existingPayment;
      }
    }

    // Amount to pay via QRIS (cashPayableAmount after coin discount)
    const basePayableAmount = order.cashPayableAmount > 0 ? order.cashPayableAmount : Math.max(0, order.grandTotal);

    if (basePayableAmount === 0 && order.coinUsed > 0) {
      throw new Error('Order 100% dibayar menggunakan Store Coin, tidak memerlukan QRIS.');
    }

    // 1. Try Dynamic AutoGoPay Gateway API
    let agpResponse = await autoGoPay.generateQRIS(basePayableAmount);

    if (agpResponse.success && agpResponse.data && (agpResponse.data.qr_string || agpResponse.data.qr_url)) {
      const data = agpResponse.data;

      // Helper to safely parse WIB dates from AutoGoPay
      const parseAutoGoPayTime = (timeStr?: string | null, fallbackDate = new Date()): Date => {
        if (!timeStr) return fallbackDate;
        let normalized = timeStr.trim();
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
          normalized = `${normalized.replace(' ', 'T')}+07:00`;
        } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
          normalized = `${normalized}+07:00`;
        }
        const parsed = new Date(normalized);
        return isNaN(parsed.getTime()) ? fallbackDate : parsed;
      };

      const parsedTxTime = parseAutoGoPayTime(data.transaction_time, new Date());
      let parsedExpiry = parseAutoGoPayTime(data.expiry_time, new Date(Date.now() + 15 * 60 * 1000));

      if (parsedExpiry.getTime() > Date.now() + 20 * 60 * 1000) {
        parsedExpiry = new Date(Date.now() + 15 * 60 * 1000);
      }

      // Create Payment record for dynamic gateway
      const payment = await db.payment.create({
        data: {
          orderId: order.id,
          provider: 'AUTOGOPAY',
          externalTransactionId: data.transaction_id,
          amount: data.amount,
          qrString: data.qr_string || null,
          qrUrl: data.qr_url || null,
          checkoutUrl: data.checkout_url || null,
          status: PaymentStatus.PENDING,
          transactionTime: parsedTxTime,
          expiryTime: parsedExpiry,
          rawResponse: JSON.stringify(data),
        },
      });

      return payment;
    }

    // 2. Smart Fallback: Dynamic Static QRIS (Gogo Gaming) + 3-Digit Unique Code
    console.warn('[PaymentService] Dynamic AutoGoPay unavailable. Activating Gogo Gaming Static QRIS with unique code fallback.');

    // Query active pending orders in the last 15 minutes to prevent unique amount collision
    const activePendingOrders = await db.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        id: { not: order.id },
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
      select: { grandTotal: true, cashPayableAmount: true },
    });

    const usedAmounts = new Set(
      activePendingOrders.map((o) => (o.cashPayableAmount > 0 ? o.cashPayableAmount : o.grandTotal))
    );

    // Pick non-colliding unique 3-digit number (between 11 and 499)
    let uniqueCode = Math.floor(Math.random() * 450) + 21;
    let attempts = 0;
    while (usedAmounts.has(basePayableAmount + uniqueCode) && attempts < 50) {
      uniqueCode = Math.floor(Math.random() * 450) + 21;
      attempts++;
    }

    const finalPayable = basePayableAmount + uniqueCode;

    // Update order with exact unique payable total
    await db.order.update({
      where: { id: order.id },
      data: {
        grandTotal: finalPayable,
        cashPayableAmount: finalPayable,
      },
    });

    // Use the 100% authentic and verified Gogo Gaming Static QRIS string
    const staticQrString = GOGO_GAMING_STATIC_QR;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(staticQrString)}`;
    const expiryDate = new Date(Date.now() + 15 * 60 * 1000);
    const txId = `GOGO-${order.orderNumber}-${uniqueCode}`;

    const payment = await db.payment.create({
      data: {
        orderId: order.id,
        provider: 'AUTOGOPAY_GOPAY_STATIC',
        externalTransactionId: txId,
        amount: finalPayable,
        qrString: staticQrString,
        qrUrl: qrImageUrl,
        checkoutUrl: null,
        status: PaymentStatus.PENDING,
        transactionTime: new Date(),
        expiryTime: expiryDate,
        rawResponse: JSON.stringify({
          fallback: true,
          merchant: 'GOGO GAMING',
          uniqueCode,
          baseAmount: basePayableAmount,
          finalPayable,
          qr_string: staticQrString,
        }),
      },
    });

    return payment;
  }

  /**
   * Processes incoming AutoGoPay webhook payload with strict HMAC verification, amount matching, and idempotency
   */
  static async processWebhook(rawBody: string, signature: string | null) {
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

    // 1. Verify HMAC Signature asynchronously with DB-backed secret key
    const signatureValid = await autoGoPay.verifyWebhookSignatureAsync(rawBody, signature);

    let payloadJson: any = {};
    try {
      payloadJson = JSON.parse(rawBody);
    } catch {}

    // AutoGoPay official webhook format has nested `transaction` object:
    // { event: "transaction.received", transaction: { transaction_id, order_id, amount, status: "PAID", payment_method: "QRIS", ... } }
    const tx = payloadJson.transaction || payloadJson.data || payloadJson;
    const externalTransactionId = tx.transaction_id || tx.transactionId || tx.id || tx.order_id || payloadJson.transaction_id || null;
    const eventName = payloadJson.event || payloadJson.event_name || 'transaction.received';
    const rawStatus = (tx.status || tx.transaction_status || payloadJson.status || payloadJson.transaction_status || '').toString().trim().toUpperCase();
    const webhookAmount = Number(tx.amount !== undefined ? tx.amount : payloadJson.amount);

    // 2. Check Idempotency log
    const existingLog = await db.paymentLog.findFirst({
      where: { payloadHash, signatureValid: true },
    });

    if (existingLog && existingLog.processed) {
      return { success: true, message: 'Webhook already processed (Idempotent)' };
    }

    // 3. Create Webhook PaymentLog record
    const paymentLog = await db.paymentLog.create({
      data: {
        provider: 'AUTOGOPAY',
        event: eventName,
        externalTransactionId: externalTransactionId || 'UNKNOWN',
        signatureValid,
        payloadHash,
        status: rawStatus,
        payload: rawBody,
      },
    });

    if (!signatureValid) {
      await db.paymentLog.update({
        where: { id: paymentLog.id },
        data: { processed: true, processingResult: 'FAILED_INVALID_SIGNATURE' },
      });
      // Trigger Telegram Webhook Error Alert
      TelegramService.sendWebhookErrorNotification('AUTOGOPAY', 'HMAC Webhook signature verification failed').catch(() => {});
      return { success: false, error: 'INVALID_SIGNATURE', code: 401 };
    }

    // Only process successful 'settlement' / 'PAID' / 'SUCCESS' payment status
    const isPaidStatus = ['PAID', 'SETTLEMENT', 'SUCCESS', '1', 'TRUE'].includes(rawStatus);
    if (!isPaidStatus) {
      await db.paymentLog.update({
        where: { id: paymentLog.id },
        data: { processed: true, processingResult: `SKIPPED_STATUS_${rawStatus}` },
      });
      return { success: true, message: `Status '${rawStatus}' logged but no settlement required` };
    }

    if (!externalTransactionId) {
      await db.paymentLog.update({
        where: { id: paymentLog.id },
        data: { processed: true, processingResult: 'MISSING_TRANSACTION_ID' },
      });
      return { success: false, error: 'MISSING_TRANSACTION_ID', code: 400 };
    }

    // 4. Match internal Payment record (try externalTransactionId first, fallback to order_id / rawResponse match)
    let payment = await db.payment.findUnique({
      where: { externalTransactionId },
      include: { order: true },
    });

    if (!payment && tx.order_id) {
      // If externalTransactionId was stored as UUID and webhook sent order_id or vice versa
      payment = await db.payment.findFirst({
        where: {
          OR: [
            { externalTransactionId: tx.order_id },
            { order: { orderNumber: tx.order_id } },
            { rawResponse: { contains: externalTransactionId } },
          ],
        },
        include: { order: true },
      });
    }

    if (!payment) {
      await db.paymentLog.update({
        where: { id: paymentLog.id },
        data: { processed: true, processingResult: 'PAYMENT_RECORD_NOT_FOUND' },
      });
      return { success: false, error: 'PAYMENT_RECORD_NOT_FOUND', code: 404 };
    }

    // 5. Strict Amount Verification against order cashPayableAmount
    const expectedAmount = payment.order.cashPayableAmount > 0 ? payment.order.cashPayableAmount : payment.order.grandTotal;

    if (!isNaN(webhookAmount) && webhookAmount !== expectedAmount) {
      await db.paymentLog.update({
        where: { id: paymentLog.id },
        data: { processed: true, processingResult: `AMOUNT_MISMATCH_EXPECTED_${expectedAmount}_GOT_${webhookAmount}` },
      });
      // Trigger Telegram Payment Mismatch Alert
      TelegramService.sendPaymentMismatchNotification({
        orderNumber: payment.order.orderNumber,
        expectedAmount,
        gotAmount: webhookAmount,
        transactionId: externalTransactionId || undefined,
      }).catch(() => {});
      return { success: false, error: 'AMOUNT_MISMATCH', code: 400 };
    }

    // 6. Idempotent Payment & Order Update
    if (payment.status === PaymentStatus.PAID || payment.order.status === OrderStatus.PAID || payment.order.status === OrderStatus.COMPLETED) {
      await db.paymentLog.update({
        where: { id: paymentLog.id },
        data: { processed: true, processingResult: 'ALREADY_PAID_IDEMPOTENT' },
      });
      return { success: true, message: 'Order is already marked as paid' };
    }

    // Execute state update inside transaction (consume coin reservation + mark PAID + increment soldCount + enqueue jobs)
    try {
    await db.$transaction(async (tx) => {
      // SECURITY: atomically claim this payment so concurrent/duplicate webhooks or
      // status polls can never settle (and fulfill) the same payment twice.
      const claim = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: PaymentStatus.PAID } },
        data: { status: PaymentStatus.PAID },
      });
      if (claim.count === 0) {
        throw new Error(ALREADY_PAID_RACE);
      }

      // Consume coin & resource reservations if exist
      await LoyaltyService.consumeReservationTx(tx, payment.orderId);
      await ReservationService.consumeReservationsForOrder(tx, payment.orderId);

      const updatedOrder = await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.PAID,
        },
        include: { items: { include: { variant: true } } },
      });

      // Enqueue FulfillmentJobs for all order items
      for (const item of updatedOrder.items) {
        const deliveryModel = (item.deliveryModelSnapshot as any) || (item.variant?.deliveryModel as any) || 'DEDICATED_ACCOUNT';
        await FulfillmentQueueService.enqueueJob(tx, payment.orderId, item.id, deliveryModel, updatedOrder.userId || undefined);

        // Increment Product.soldCount for each purchased item
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
    } catch (err: any) {
      if (err?.message === ALREADY_PAID_RACE) {
        await db.paymentLog.update({
          where: { id: paymentLog.id },
          data: { processed: true, processingResult: 'ALREADY_PAID_IDEMPOTENT' },
        });
        return { success: true, message: 'Order is already marked as paid' };
      }
      throw err;
    }

    // 7. Trigger Immediate Fulfillment Queue Execution & Legacy Sync Strategy
    await FulfillmentQueueService.processQueueBatch(10);
    const fulfillmentRes = await FulfillmentService.fulfillOrder(payment.orderId);

    // Publish PAYMENT_SETTLED domain event
    await DomainEventService.publish({
      eventName: 'PAYMENT_SETTLED',
      userId: payment.order.userId,
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
    });

    await db.paymentLog.update({
      where: { id: paymentLog.id },
      data: {
        processed: true,
        processedAt: new Date(),
        processingResult: fulfillmentRes.success ? 'FULFILLED_SUCCESSFULLY' : `NEEDS_FULFILLMENT: ${fulfillmentRes.outOfStockItems.join(', ')}`,
      },
    });

    return {
      success: true,
      message: 'Payment verified and order fulfilled successfully',
    };
  }

  /**
   * Safely expires a pending order, releasing coin & inventory reservations
   */
  static async expireOrder(orderId: string, reason: string = 'PAYMENT_EXPIRED') {
    return await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payments: { orderBy: { createdAt: 'desc' } } },
      });

      if (!order) return null;
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        return order;
      }

      // Release reserved Store Coins
      await LoyaltyService.releaseReservationTx(tx, order.id, reason);

      // Release reserved inventory & slot resources
      await ReservationService.releaseReservationsForOrder(tx, order.id, reason);

      // Revert any applied coupon usage and decrement usedCount
      await CouponService.revertCouponUsageTx(tx, order.id);

      // Mark payment as EXPIRED
      if (order.payments.length > 0) {
        await tx.payment.update({
          where: { id: order.payments[0].id },
          data: { status: PaymentStatus.EXPIRED },
        });
      }

      // Mark order as EXPIRED
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.EXPIRED,
          paymentStatus: PaymentStatus.EXPIRED,
        },
        include: { items: true, payments: true },
      });

      return updatedOrder;
    });
  }

  /**
   * Helper to check & sync payment status from AutoGoPay gateway + real-time mutation reconciliation
   */
  static async checkAndSyncStatus(orderNumber: string) {
    const order = await db.order.findUnique({
      where: { orderNumber },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
    });

    if (!order) return { status: 'NOT_FOUND' };

    if (order.status === OrderStatus.PAID || order.status === OrderStatus.COMPLETED) {
      return { status: 'PAID', order };
    }

    if (order.status === OrderStatus.EXPIRED || order.status === OrderStatus.CANCELLED || order.status === OrderStatus.FAILED) {
      return { status: order.status, order };
    }

    const latestPayment = order.payments[0];
    const now = new Date();

    // Check 15-minute expiration time window
    const expiryTime = latestPayment?.expiryTime
      ? new Date(latestPayment.expiryTime).getTime()
      : new Date(order.createdAt).getTime() + 15 * 60 * 1000;

    if (now.getTime() >= expiryTime) {
      const expiredOrder = await this.expireOrder(order.id, 'PAYMENT_TIMEOUT_EXPIRED');
      return { status: 'EXPIRED', order: expiredOrder };
    }

    const expectedAmt = order.cashPayableAmount > 0 ? order.cashPayableAmount : order.grandTotal;

    // 1. Check Dynamic Gateway Status (if standard transaction ID exists)
    if (latestPayment?.externalTransactionId && !latestPayment.externalTransactionId.startsWith('GOGO-')) {
      try {
        const statusRes = await autoGoPay.getQRISStatus(latestPayment.externalTransactionId);
        if (statusRes.success && statusRes.data) {
          const data = statusRes.data;
          const rawStatus = (data.transaction_status || data.status || '').toString().trim().toLowerCase();
          const isPaid = data.paid || ['settlement', 'paid', 'success', 'settled'].includes(rawStatus);

          if (isPaid) {
            const mockWebhookBody = JSON.stringify({
              event: 'transaction.received',
              transaction: {
                transaction_id: latestPayment.externalTransactionId,
                order_id: latestPayment.externalTransactionId,
                status: 'PAID',
                amount: expectedAmt,
                payment_method: data.payment_type || 'QRIS',
              },
            });

            const apiKey = await autoGoPay.getApiKeyAsync();
            const mockSig = apiKey
              ? crypto.createHmac('sha256', apiKey).update(mockWebhookBody).digest('hex')
              : 'internal_sync_sig';

            await PaymentService.processWebhook(mockWebhookBody, mockSig);
            return { status: 'PAID', order };
          } else if (['expire', 'expired', 'cancel', 'cancelled', 'deny', 'failed'].includes(rawStatus)) {
            const expiredOrder = await this.expireOrder(order.id, `PAYMENT_GATEWAY_${rawStatus.toUpperCase()}`);
            return { status: 'EXPIRED', order: expiredOrder };
          }
        }
      } catch (err: any) {
        console.warn('[PaymentService] Error checking dynamic QRIS status:', err.message);
      }
    }

    // 2. Real-time Auto-Reconciliation via AutoGoPay /transactions mutations
    try {
      // SECURITY: a mutation is only identified by amount + time. If another pending order
      // expects the exact same amount, we cannot know which order this money belongs to,
      // so never auto-match (the gateway webhook / status API will settle the right one).
      // Also ambiguous when another order with the same amount was settled recently: the
      // mutation we see may be that order's money (its webhook id can differ from the mutation id).
      const sameAmount = [
        { cashPayableAmount: expectedAmt },
        { cashPayableAmount: 0, grandTotal: expectedAmt },
      ];
      const recentWindow = new Date(Date.now() - 30 * 60 * 1000);
      const ambiguousCount = await db.order.count({
        where: {
          id: { not: order.id },
          OR: [
            { status: OrderStatus.PENDING_PAYMENT, createdAt: { gte: recentWindow }, OR: sameAmount },
            { paymentStatus: PaymentStatus.PAID, updatedAt: { gte: recentWindow }, OR: sameAmount },
          ],
        },
      });

      const recentTxRes = ambiguousCount > 0
        ? { success: false, transactions: [] as any[] }
        : await autoGoPay.getRecentTransactions();

      if (ambiguousCount > 0) {
        console.warn(`[PaymentService] Skipping mutation auto-match for ${order.orderNumber}: ${ambiguousCount} other pending order(s) share amount ${expectedAmt}.`);
      }

      if (recentTxRes.success && recentTxRes.transactions.length > 0) {
        const orderCreatedTime = new Date(order.createdAt).getTime() - 30 * 1000; // 30s clock-skew buffer (QR cannot be paid before the order exists)

        // SECURITY: mutations that already settled another order must never be reused.
        const candidateKeys = recentTxRes.transactions
          .filter((tx: any) => tx && tx.status === 'settlement')
          .map((tx: any) => getMutationKey(tx));
        const consumedLogs = candidateKeys.length
          ? await db.paymentLog.findMany({
              where: {
                externalTransactionId: { in: candidateKeys },
                signatureValid: true,
                OR: [
                  { processingResult: { startsWith: 'FULFILLED' } },
                  { processingResult: { startsWith: 'NEEDS_FULFILLMENT' } },
                ],
              },
              select: { externalTransactionId: true },
            })
          : [];
        const consumedKeys = new Set(consumedLogs.map((l) => l.externalTransactionId));

        const matchedTx = recentTxRes.transactions.find((tx: any) => {
          if (!tx || tx.status !== 'settlement') return false;
          if (consumedKeys.has(getMutationKey(tx))) return false;
          if (Math.round(Number(tx.amount)) !== Math.round(Number(expectedAmt))) return false;

          if (tx.time) {
            let normalized = tx.time.trim();
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
              normalized = `${normalized.replace(' ', 'T')}+07:00`;
            }
            const txTime = new Date(normalized).getTime();
            if (!isNaN(txTime) && txTime < orderCreatedTime) {
              return false; // Transaction is older than order creation
            }
          }
          return true;
        });

        if (matchedTx) {
          console.log(`[PaymentService] Auto-matched mutation for order ${order.orderNumber}:`, matchedTx);
          const mockWebhookBody = JSON.stringify({
            event: 'transaction.received',
            transaction: {
              transaction_id: getMutationKey(matchedTx),
              order_id: order.orderNumber,
              status: 'PAID',
              amount: expectedAmt,
              payment_method: matchedTx.issuer ? `QRIS_${matchedTx.issuer.toUpperCase()}` : 'QRIS',
              paid_at: matchedTx.time || new Date().toISOString(),
            },
          });

          const apiKey = await autoGoPay.getApiKeyAsync();
          const mockSig = apiKey
            ? crypto.createHmac('sha256', apiKey).update(mockWebhookBody).digest('hex')
            : 'internal_sync_sig';

          await PaymentService.processWebhook(mockWebhookBody, mockSig);
          return { status: 'PAID', order };
        }
      }
    } catch (err: any) {
      console.warn('[PaymentService] Error checking recent mutation transactions:', err.message);
    }

    return { status: order.status, order };
  }

  /**
   * Sweeps all pending orders that have passed their 15-minute expiration window and auto-expires them
   */
  static async sweepExpiredOrders(): Promise<{ expiredCount: number }> {
    try {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

      const overdueOrders = await db.order.findMany({
        where: {
          status: OrderStatus.PENDING_PAYMENT,
          OR: [
            { createdAt: { lte: fifteenMinsAgo } },
            { payments: { some: { expiryTime: { lte: new Date() } } } },
          ],
        },
        select: { id: true, orderNumber: true },
      });

      if (overdueOrders.length === 0) {
        return { expiredCount: 0 };
      }

      console.log(`[PaymentService] Sweeping ${overdueOrders.length} overdue orders for auto-expiration...`);
      let expiredCount = 0;

      for (const orderItem of overdueOrders) {
        try {
          await this.expireOrder(orderItem.id, 'AUTOMATIC_15MIN_EXPIRATION_SWEEP');
          expiredCount++;
        } catch (err: any) {
          console.error(`[PaymentService] Failed to auto-expire order ${orderItem.orderNumber}:`, err.message);
        }
      }

      return { expiredCount };
    } catch (err: any) {
      console.error('[PaymentService] sweepExpiredOrders error:', err.message);
      return { expiredCount: 0 };
    }
  }
}
