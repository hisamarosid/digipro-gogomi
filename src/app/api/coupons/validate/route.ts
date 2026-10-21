import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { CouponService } from '@/services/coupon.service';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const body = await req.json();
    const { code, subtotal, email } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, valid: false, error: 'Kode kupon wajib diisi' },
        { status: 400 }
      );
    }

    const subtotalAmount = subtotal ? Number(subtotal) : 0;
    const userId = session?.userId;
    let customerEmail = email ? String(email).trim().toLowerCase() : undefined;
    if (!customerEmail && userId) {
      const { db } = await import('@/lib/db/prisma');
      const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (user) customerEmail = user.email.toLowerCase();
    }

    const result = await CouponService.validateCoupon(code, subtotalAmount, userId, customerEmail);

    if (!result.valid) {
      return NextResponse.json({
        success: false,
        valid: false,
        discountAmount: 0,
        error: result.message,
      });
    }

    return NextResponse.json({
      success: true,
      valid: true,
      discountAmount: result.discountAmount,
      coupon: {
        code: result.coupon.code,
        type: result.coupon.type,
        value: result.coupon.value,
        minimumPurchase: result.coupon.minimumPurchase,
        maximumDiscount: result.coupon.maximumDiscount,
      },
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, valid: false, error: error.message }, { status: 500 });
  }
}
