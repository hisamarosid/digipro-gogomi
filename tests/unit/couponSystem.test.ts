import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db/prisma';
import { CouponService } from '@/services/coupon.service';

describe('Coupon System Unit Tests', () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await db.user.create({
      data: {
        name: 'Coupon Tester',
        email: `coupon_tester_${Date.now()}@example.com`,
        passwordHash: 'hashedpass',
        role: 'CUSTOMER',
      },
    });
  });

  it('1. Should correctly apply percentage coupon with maximum discount cap', async () => {
    const couponCode = `PERC50_${Date.now()}`;
    const coupon = await CouponService.createCoupon({
      code: couponCode,
      type: 'PERCENTAGE',
      value: 50, // 50%
      minimumPurchase: 50000,
      maximumDiscount: 20000, // Max Rp20.000 cap
    });

    // Case A: Subtotal Rp100.000 (50% is Rp50.000, but capped at Rp20.000)
    const resA = await CouponService.validateCoupon(couponCode, 100000, testUser.id);
    expect(resA.valid).toBe(true);
    expect(resA.discountAmount).toBe(20000);

    // Case B: Subtotal Rp30.000 (50% is Rp15.000, below cap Rp20.000)
    const resB = await CouponService.validateCoupon(couponCode, 30000, testUser.id);
    expect(resB.valid).toBe(false); // Fails minimum purchase requirement of Rp50.000
    expect(resB.message).toContain('Minimal Pembelian');
  });

  it('2. Should correctly apply fixed amount coupon', async () => {
    const couponCode = `FIXED15K_${Date.now()}`;
    await CouponService.createCoupon({
      code: couponCode,
      type: 'FIXED',
      value: 15000, // Rp15.000 OFF
      minimumPurchase: 30000,
    });

    const res = await CouponService.validateCoupon(couponCode, 50000, testUser.id);
    expect(res.valid).toBe(true);
    expect(res.discountAmount).toBe(15000);
  });

  it('3. Should enforce global usage limits', async () => {
    const couponCode = `LIMIT1_${Date.now()}`;
    const coupon = await CouponService.createCoupon({
      code: couponCode,
      type: 'FIXED',
      value: 10000,
      usageLimit: 1, // Only 1 global usage allowed
    });

    // Manually increment usedCount to simulate 1 usage
    await db.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: 1 },
    });

    const res = await CouponService.validateCoupon(couponCode, 50000, testUser.id);
    expect(res.valid).toBe(false);
    expect(res.message).toContain('Batas total penggunaan kupon ini sudah habis');
  });

  it('4. Should enforce per-user usage limits', async () => {
    const couponCode = `PERUSER1_${Date.now()}`;
    const coupon = await CouponService.createCoupon({
      code: couponCode,
      type: 'FIXED',
      value: 10000,
      usagePerUser: 1, // Max 1 usage per user
    });

    // Create a dummy order to link CouponUsage
    const category = await db.category.create({
      data: { name: `Cat ${Date.now()}`, slug: `cat-c-${Date.now()}` },
    });

    const order = await db.order.create({
      data: {
        orderNumber: `ORD-C-${Date.now()}`,
        userId: testUser.id,
        couponId: coupon.id,
        totalAmount: 50000,
        grandTotal: 50000,
        status: 'COMPLETED',
      },
    });

    // Record usage for testUser
    await db.couponUsage.create({
      data: {
        couponId: coupon.id,
        userId: testUser.id,
        orderId: order.id,
      },
    });

    const res = await CouponService.validateCoupon(couponCode, 50000, testUser.id);
    expect(res.valid).toBe(false);
    expect(res.message).toContain('telah mencapai batas maksimal');
  });

  it('5. Should reject expired coupons', async () => {
    const couponCode = `EXPIRED_${Date.now()}`;
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
    await CouponService.createCoupon({
      code: couponCode,
      type: 'PERCENTAGE',
      value: 20,
      expiresAt: pastDate,
    });

    const res = await CouponService.validateCoupon(couponCode, 50000, testUser.id);
    expect(res.valid).toBe(false);
    expect(res.message).toContain('sudah kedaluwarsa');
  });

  it('6. Should allow Admin to toggle coupon status and update details', async () => {
    const couponCode = `TOGGLE_${Date.now()}`;
    const coupon = await CouponService.createCoupon({
      code: couponCode,
      type: 'PERCENTAGE',
      value: 10,
      active: true,
    });

    // Toggle to inactive
    const toggled = await CouponService.toggleCouponStatus(coupon.id);
    expect(toggled.active).toBe(false);

    // Validation should fail when inactive
    const resInactive = await CouponService.validateCoupon(couponCode, 50000, testUser.id);
    expect(resInactive.valid).toBe(false);

    // Update coupon value to 25%
    const updated = await CouponService.updateCoupon(coupon.id, {
      value: 25,
      active: true,
    });
    expect(updated.value).toBe(25);

    const resActive = await CouponService.validateCoupon(couponCode, 100000, testUser.id);
    expect(resActive.valid).toBe(true);
    expect(resActive.discountAmount).toBe(25000);
  });
});
