import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { CouponService } from '@/services/coupon.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'ALL';

    const where: any = {};

    if (query.trim()) {
      where.code = { contains: query.trim().toUpperCase() };
    }

    if (status === 'ACTIVE') {
      where.active = true;
    } else if (status === 'INACTIVE') {
      where.active = false;
    } else if (status === 'EXPIRED') {
      where.expiresAt = { lt: new Date() };
    }

    const coupons = await db.coupon.findMany({
      where,
      include: {
        _count: { select: { couponUsages: true, orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalCount = await db.coupon.count();
    const activeCount = await db.coupon.count({ where: { active: true } });
    const inactiveCount = await db.coupon.count({ where: { active: false } });

    // Calculate total discount given across all orders
    const orderDiscounts = await db.order.aggregate({
      _sum: { discountAmount: true },
      where: { couponId: { not: null } },
    });

    const totalDiscountGiven = orderDiscounts._sum.discountAmount || 0;

    return NextResponse.json({
      success: true,
      data: {
        coupons,
        summary: {
          totalCount,
          activeCount,
          inactiveCount,
          totalDiscountGiven,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await req.json();
    const newCoupon = await CouponService.createCoupon(body);

    return NextResponse.json({ success: true, data: newCoupon });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
