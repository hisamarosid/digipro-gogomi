import { db } from '@/lib/db/prisma';
import { generateOrderNumber, generateSecureToken } from '@/lib/utils/formatters';
import { isAllowedEmailDomain, EMAIL_DOMAIN_ERROR_MESSAGE } from '@/lib/auth/validation';
import { CouponService } from './coupon.service';
import { LoyaltyService } from './loyalty.service';
import { FulfillmentService } from './fulfillment.service';
import { DomainEventService } from './domainEvent.service';
import { OrderStatus, PaymentStatus } from '../../generated/prisma';

export interface CreateOrderItemInput {
  variantId: string;
  quantity: number;
  invitationEmail?: string;
}

export interface CreateOrderInput {
  userId?: string;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  couponCode?: string;
  requestedCoins?: number;
  items: CreateOrderItemInput[];
}

export class OrderService {
  /**
   * Creates an order with strict server-side price calculations, stock checks, coupon discounts, and loyalty coin calculations
   */
  static async createOrder(input: CreateOrderInput) {
    if (!input.items || input.items.length === 0) {
      throw new Error('Order items cannot be empty');
    }

    let cleanGuestEmail = input.guestEmail?.toLowerCase().trim();
    if (!input.userId) {
      if (!cleanGuestEmail || !input.guestName?.trim()) {
        throw new Error('Nama dan Email pengiriman produk wajib diisi.');
      }
      if (!isAllowedEmailDomain(cleanGuestEmail)) {
        throw new Error(EMAIL_DOMAIN_ERROR_MESSAGE);
      }
    }

    // 1. Fetch active variants and calculate snapshot totals server-side
    let subtotalAmount = 0;
    const itemSnapshots: any[] = [];

    for (const itemInput of input.items) {
      const variant = await db.productVariant.findUnique({
        where: { id: itemInput.variantId },
        include: { product: true },
      });

      if (!variant || !variant.active || variant.product.status !== 'ACTIVE') {
        throw new Error(`Produk variant '${itemInput.variantId}' tidak aktif atau tidak ditemukan`);
      }

      const qty = Math.max(1, itemInput.quantity);
      const unitPrice = variant.price; // IDR Integer
      const lineSubtotal = unitPrice * qty;
      subtotalAmount += lineSubtotal;

      itemSnapshots.push({
        variantId: variant.id,
        productName: variant.product.name,
        variantName: variant.name,
        sku: variant.sku,
        unitPrice,
        quantity: qty,
        subtotal: lineSubtotal,
        deliveryType: variant.deliveryType,
        deliveryModelSnapshot: variant.deliveryModel || 'DEDICATED_ACCOUNT',
        invitationEmail: itemInput.invitationEmail || null,
        warrantyDays: variant.warrantyDays || 30,
        guideVersionSnapshot: (variant.product as any).guideVersion || 1,
        tutorialSnapshot: (variant.product as any).tutorialContent || null,
        termsSnapshot: (variant.product as any).termsContent || null,
        importantNotesSnapshot: (variant.product as any).importantNotes || null,
        requireGuideAcknowledgementSnapshot: (variant.product as any).requireGuideAcknowledgement || false,
      });
    }

    // 2. Validate coupon if provided
    let discountAmount = 0;
    let validCouponId: string | undefined = undefined;

    if (input.couponCode) {
      const customerEmail = cleanGuestEmail || (input.userId ? (await db.user.findUnique({ where: { id: input.userId }, select: { email: true } }))?.email : undefined);
      const couponRes = await CouponService.validateCoupon(
        input.couponCode,
        subtotalAmount,
        input.userId,
        customerEmail
      );
      if (couponRes.valid && couponRes.coupon) {
        discountAmount = couponRes.discountAmount;
        validCouponId = couponRes.coupon.id;
      } else if (!couponRes.valid) {
        throw new Error(couponRes.message || 'Kode kupon promo tidak valid');
      }
    }

    // 3. Calculate Loyalty Coin redemption & earning
    const loyaltyRes = await LoyaltyService.calculateOrderLoyalty({
      userId: input.userId,
      items: input.items.map((i) => {
        const snap = itemSnapshots.find((s) => s.variantId === i.variantId);
        return { variantId: i.variantId, quantity: i.quantity, price: snap ? snap.unitPrice : 0 };
      }),
      couponDiscount: discountAmount,
      requestedCoins: input.requestedCoins || 0,
    });

    if (input.requestedCoins && input.requestedCoins > 0 && loyaltyRes.error) {
      throw new Error(loyaltyRes.error);
    }

    const coinUsed = loyaltyRes.usableCoins;
    const coinDiscountAmount = loyaltyRes.coinDiscountAmount;
    const cashPayableAmount = loyaltyRes.cashPayableAmount;
    const grandTotal = Math.max(0, subtotalAmount - discountAmount - coinDiscountAmount);
    const orderNumber = generateOrderNumber();
    const guestToken = input.userId ? undefined : generateSecureToken(32);
    const orderExpiryDate = new Date(Date.now() + 15 * 60 * 1000); // 15 min QRIS expiry

    // 4. Save Order and OrderItems to database inside transaction
    const order = await db.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: input.userId || null,
          guestEmail: cleanGuestEmail || null,
          guestName: input.guestName ? input.guestName.trim() : null,
          guestPhone: input.guestPhone ? input.guestPhone.trim() : null,
          guestToken: guestToken || null,
          totalAmount: subtotalAmount,
          discountAmount,
          grandTotal,
          coinUsed,
          coinDiscountAmount,
          coinValuePerUnitSnapshot: loyaltyRes.currencyValuePerCoin,
          cashPayableAmount,
          rewardPercentageSnapshot: loyaltyRes.effectiveRewardPercentage,
          eligibleRewardAmount: cashPayableAmount,
          coinsEarned: loyaltyRes.estimatedCoinsEarned,
          couponId: validCouponId || null,
          status: OrderStatus.PENDING_PAYMENT,
          paymentStatus: PaymentStatus.PENDING,
          items: {
            create: itemSnapshots,
          },
        },
        include: {
          items: true,
        },
      });

      // Record coupon usage if applied
      if (validCouponId) {
        await tx.couponUsage.create({
          data: {
            couponId: validCouponId,
            userId: input.userId || null,
            orderId: newOrder.id,
          },
        });
        await tx.coupon.update({
          where: { id: validCouponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Reserve Coins if user redeemed coins
      if (input.userId && coinUsed > 0) {
        await LoyaltyService.reserveCoinsTx(tx, input.userId, newOrder.id, coinUsed, orderExpiryDate);
      }

      return newOrder;
    });

    const firstItem = order.items?.[0];
    const prodName = order.items && order.items.length > 1
      ? `${firstItem?.productName || 'Produk'} (+${order.items.length - 1} item lainnya)`
      : firstItem?.productName || 'Produk Digital';
    const varName = order.items && order.items.length > 1
      ? order.items.map((i: any) => i.variantName).filter(Boolean).join(', ')
      : firstItem?.variantName || '-';

    // Publish ORDER_CREATED domain event for Admin & Customer Notifications
    await DomainEventService.publish({
      eventName: 'ORDER_CREATED',
      userId: order.userId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      metadata: {
        customerName: input.guestName || 'Customer',
        productName: prodName,
        variantName: varName,
        totalAmount: order.grandTotal,
      },
    });

    // 5. Check 100% Coin Payment (Final Payable = Rp0)
    if (cashPayableAmount === 0 && coinUsed > 0) {
      await db.$transaction(async (tx) => {
        // Consume reservation immediately
        await LoyaltyService.consumeReservationTx(tx, order.id);

        // Update order & payment status
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            paymentStatus: PaymentStatus.PAID,
          },
          include: { items: true },
        });

        // Increment Product.soldCount for each purchased item
        for (const item of updatedOrder.items) {
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

        // Create internal payment record
        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: 'COIN',
            externalTransactionId: `COIN-${order.id}-${Date.now()}`,
            amount: 0,
            status: PaymentStatus.PAID,
            transactionTime: new Date(),
          },
        });
      });

      // Process fulfillment
      await FulfillmentService.fulfillOrder(order.id);
    }

    return await db.order.findUnique({
      where: { id: order.id },
      include: { items: true, payments: true, coinReservation: true },
    }) || order;
  }

  /**
   * Safe Order lookup by orderNumber verifying ownership or guest access token
   */
  static async getOrderByNumber(
    orderNumber: string,
    options?: { userId?: string; guestToken?: string; isAdmin?: boolean }
  ) {
    const order = await db.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            fulfillments: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        coinReservation: true,
        coinRedemption: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!order) return null;

    // Auto-expire overdue pending payment orders on the fly
    if (order.status === OrderStatus.PENDING_PAYMENT) {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const isExpiredByTime =
        order.createdAt <= fifteenMinsAgo ||
        order.payments.some((p) => p.expiryTime && new Date(p.expiryTime) <= new Date());
      if (isExpiredByTime) {
        const { PaymentService } = await import('./payment.service');
        const expired = await PaymentService.expireOrder(order.id, 'AUTOMATIC_15MIN_EXPIRATION_SWEEP');
        if (expired) {
          (order as any).status = OrderStatus.EXPIRED;
          (order as any).paymentStatus = PaymentStatus.EXPIRED;
        }
      }
    }

    if (options?.isAdmin) return order;

    if (options?.userId && order.userId === options.userId) return order;

    if (options?.guestToken && order.guestToken === options.guestToken) return order;

    return null;
  }

  /**
   * Safely links historical guest orders placed with the user's email to their registered account.
   * Also synchronizes slot assignments and subscriptions atomically without altering business data.
   */
  static async claimGuestOrdersForUser(userId: string, email: string) {
    if (!userId || !email) return { claimedCount: 0 };
    const cleanEmail = email.toLowerCase().trim();

    try {
      // Security: guest orders carry credentials. Only link them once the account owner has proven
      // they control this inbox; otherwise anyone could register with someone else's email.
      const owner = await db.user.findUnique({
        where: { id: userId },
        select: { email: true, emailVerified: true },
      });
      if (!owner || !owner.emailVerified || owner.email.toLowerCase().trim() !== cleanEmail) {
        return { claimedCount: 0 };
      }

      const guestOrders = await db.order.findMany({
        where: {
          userId: null,
          guestEmail: cleanEmail,
        },
        select: { id: true },
      });

      if (guestOrders.length === 0) return { claimedCount: 0 };

      const guestOrderIds = guestOrders.map((o) => o.id);

      await db.$transaction(async (tx) => {
        // 1. Link Orders to User
        await tx.order.updateMany({
          where: { id: { in: guestOrderIds } },
          data: { userId },
        });

        // 2. Link Shared Account Slots
        await tx.sharedAccountSlot.updateMany({
          where: {
            orderId: { in: guestOrderIds },
            assignedUserId: null,
          },
          data: { assignedUserId: userId },
        });

        // 3. Link Family Member Slots
        await tx.familyMemberSlot.updateMany({
          where: {
            orderId: { in: guestOrderIds },
            userId: null,
          },
          data: { userId },
        });

        // 4. Link Resource Reservations
        await tx.resourceReservation.updateMany({
          where: {
            orderId: { in: guestOrderIds },
            userId: null,
          },
          data: { userId },
        });

        // 5. Link Fulfillment Jobs
        await tx.fulfillmentJob.updateMany({
          where: {
            orderId: { in: guestOrderIds },
            userId: null,
          },
          data: { userId },
        });

        // 6. Link Coupon Usages
        await tx.couponUsage.updateMany({
          where: {
            orderId: { in: guestOrderIds },
            userId: null,
          },
          data: { userId },
        });
      });

      return { claimedCount: guestOrderIds.length };
    } catch (error) {
      console.error('[OrderService.claimGuestOrdersForUser Error]:', error);
      return { claimedCount: 0 };
    }
  }
}

