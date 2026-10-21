import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { LoyaltyService } from '@/services/loyalty.service';
import { CouponService } from '@/services/coupon.service';
import { db } from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const body = await req.json();
    const { items, couponCode, requestedCoins = 0, email } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart items empty' }, { status: 400 });
    }

    // 1. Calculate subtotal & coupon discount
    let grossSubtotal = 0;
    const itemDetails = [];
    for (const item of items) {
      const variant = await db.productVariant.findUnique({
        where: { id: item.variantId },
      });
      if (variant) {
        const qty = Math.max(1, item.quantity);
        const line = variant.price * qty;
        grossSubtotal += line;
        itemDetails.push({ variantId: variant.id, quantity: qty, price: variant.price });
      }
    }

    let couponDiscount = 0;
    if (couponCode) {
      let customerEmail = email ? String(email).trim().toLowerCase() : undefined;
      if (!customerEmail && session?.userId) {
        const user = await db.user.findUnique({ where: { id: session.userId }, select: { email: true } });
        if (user) customerEmail = user.email.toLowerCase();
      }
      const couponRes = await CouponService.validateCoupon(couponCode, grossSubtotal, session?.userId, customerEmail);
      if (couponRes.valid) {
        couponDiscount = couponRes.discountAmount;
      }
    }

    // 2. Calculate Order Loyalty preview
    const loyalty = await LoyaltyService.calculateOrderLoyalty({
      userId: session?.userId,
      items: itemDetails,
      couponDiscount,
      requestedCoins: Number(requestedCoins),
    });

    return NextResponse.json({
      success: true,
      data: loyalty,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
