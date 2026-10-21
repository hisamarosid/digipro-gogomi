import { db } from '@/lib/db/prisma';

export interface CouponValidationResult {
  valid: boolean;
  coupon?: any;
  discountAmount: number;
  message?: string;
}

export class CouponService {
  /**
   * Validates a coupon code server-side against an order subtotal and user/guest email anti-fraud restrictions
   */
  static async validateCoupon(
    code: string,
    subtotalAmount: number,
    userId?: string,
    email?: string
  ): Promise<CouponValidationResult> {
    if (!code || typeof code !== 'string') {
      return { valid: false, discountAmount: 0, message: 'Kode kupon kosong' };
    }

    const cleanCode = code.toUpperCase().trim();
    const cleanEmail = email ? email.toLowerCase().trim() : undefined;

    const coupon = await db.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon || !coupon.active) {
      return { valid: false, discountAmount: 0, message: 'Kupon tidak ditemukan atau tidak aktif' };
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      return { valid: false, discountAmount: 0, message: 'Kupon belum berlaku' };
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      return { valid: false, discountAmount: 0, message: 'Kupon sudah kedaluwarsa' };
    }

    if (subtotalAmount < coupon.minimumPurchase) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Minimal Pembelian untuk kupon ini adalah Rp${coupon.minimumPurchase.toLocaleString('id-ID')}`,
      };
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, discountAmount: 0, message: 'Batas total penggunaan kupon ini sudah habis' };
    }

    // Anti-fraud check: usage limit per user / email
    const usageLimitPerUser = coupon.usagePerUser || 1;
    if (userId || cleanEmail) {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

      // Build customer identity filter (checks both registered userId and customer email)
      const userConditions: any[] = [];
      if (userId) {
        userConditions.push({ userId });
      }
      if (cleanEmail) {
        userConditions.push({ guestEmail: cleanEmail });
        userConditions.push({ user: { email: cleanEmail } });
      }

      // Count active / completed orders using this coupon by this customer
      const existingUserOrdersCount = await db.order.count({
        where: {
          couponId: coupon.id,
          OR: userConditions,
          // Exclude expired or cancelled orders from blocking customer usage
          NOT: {
            status: { in: ['EXPIRED', 'CANCELLED', 'FAILED'] },
          },
        },
      });

      if (existingUserOrdersCount >= usageLimitPerUser) {
        return {
          valid: false,
          discountAmount: 0,
          message: `Anda telah mencapai batas maksimal (${usageLimitPerUser}x) penggunaan kupon ini`,
        };
      }
    }

    // Calculate discount amount in IDR
    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = Math.floor((subtotalAmount * coupon.value) / 100);
      if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
        discountAmount = coupon.maximumDiscount;
      }
    } else {
      discountAmount = coupon.value;
    }

    // Discount cannot exceed subtotal
    if (discountAmount > subtotalAmount) {
      discountAmount = subtotalAmount;
    }

    return {
      valid: true,
      coupon,
      discountAmount,
      message: 'Kupon berhasil digunakan!',
    };
  }

  /**
   * Safely reverts coupon usage and decrements usedCount when an order is cancelled or expired
   */
  static async revertCouponUsageTx(tx: any, orderId: string) {
    try {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true, couponId: true },
      });

      if (!order || !order.couponId) return;

      // 1. Delete associated coupon usage records for this order
      await tx.couponUsage.deleteMany({
        where: { orderId: order.id },
      });

      // 2. Decrement coupon usedCount safely
      const coupon = await tx.coupon.findUnique({
        where: { id: order.couponId },
        select: { id: true, usedCount: true },
      });

      if (coupon && coupon.usedCount > 0) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { decrement: 1 } },
        });
      }
    } catch (err: any) {
      console.error(`[CouponService] Error reverting coupon for order ${orderId}:`, err.message);
    }
  }

  /**
   * Creates a new promo coupon
   */
  static async createCoupon(data: {
    code: string;
    type?: 'PERCENTAGE' | 'FIXED';
    value: number;
    minimumPurchase?: number;
    maximumDiscount?: number | null;
    usageLimit?: number | null;
    usagePerUser?: number;
    startsAt?: Date | null;
    expiresAt?: Date | null;
    active?: boolean;
  }) {
    const formattedCode = data.code.trim().toUpperCase();

    const existing = await db.coupon.findUnique({
      where: { code: formattedCode },
    });

    if (existing) {
      throw new Error(`Kode kupon '${formattedCode}' sudah digunakan`);
    }

    if (data.value <= 0) {
      throw new Error('Nilai diskon harus lebih besar dari 0');
    }

    if (data.type === 'PERCENTAGE' && data.value > 100) {
      throw new Error('Persentase diskon tidak boleh melebihi 100%');
    }

    return await db.coupon.create({
      data: {
        code: formattedCode,
        type: data.type || 'PERCENTAGE',
        value: Number(data.value),
        minimumPurchase: data.minimumPurchase ? Number(data.minimumPurchase) : 0,
        maximumDiscount: data.maximumDiscount ? Number(data.maximumDiscount) : null,
        usageLimit: data.usageLimit ? Number(data.usageLimit) : null,
        usagePerUser: data.usagePerUser ? Number(data.usagePerUser) : 1,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        active: data.active !== undefined ? Boolean(data.active) : true,
      },
    });
  }

  /**
   * Updates an existing coupon configuration
   */
  static async updateCoupon(
    id: string,
    data: {
      code?: string;
      type?: 'PERCENTAGE' | 'FIXED';
      value?: number;
      minimumPurchase?: number;
      maximumDiscount?: number | null;
      usageLimit?: number | null;
      usagePerUser?: number;
      startsAt?: Date | null;
      expiresAt?: Date | null;
      active?: boolean;
    }
  ) {
    const coupon = await db.coupon.findUnique({ where: { id } });
    if (!coupon) throw new Error('Kupon tidak ditemukan');

    let formattedCode = coupon.code;
    if (data.code && data.code.trim().toUpperCase() !== coupon.code) {
      formattedCode = data.code.trim().toUpperCase();
      const existing = await db.coupon.findUnique({ where: { code: formattedCode } });
      if (existing) throw new Error(`Kode kupon '${formattedCode}' sudah digunakan`);
    }

    const value = data.value !== undefined ? Number(data.value) : coupon.value;
    const type = data.type || coupon.type;

    if (value <= 0) throw new Error('Nilai diskon harus lebih besar dari 0');
    if (type === 'PERCENTAGE' && value > 100) throw new Error('Persentase diskon tidak boleh melebihi 100%');

    return await db.coupon.update({
      where: { id },
      data: {
        code: formattedCode,
        type,
        value,
        minimumPurchase: data.minimumPurchase !== undefined ? Number(data.minimumPurchase) : coupon.minimumPurchase,
        maximumDiscount: data.maximumDiscount !== undefined ? (data.maximumDiscount ? Number(data.maximumDiscount) : null) : coupon.maximumDiscount,
        usageLimit: data.usageLimit !== undefined ? (data.usageLimit ? Number(data.usageLimit) : null) : coupon.usageLimit,
        usagePerUser: data.usagePerUser !== undefined ? Number(data.usagePerUser) : coupon.usagePerUser,
        startsAt: data.startsAt !== undefined ? (data.startsAt ? new Date(data.startsAt) : null) : coupon.startsAt,
        expiresAt: data.expiresAt !== undefined ? (data.expiresAt ? new Date(data.expiresAt) : null) : coupon.expiresAt,
        active: data.active !== undefined ? Boolean(data.active) : coupon.active,
      },
    });
  }

  /**
   * Toggles active status of a coupon
   */
  static async toggleCouponStatus(id: string) {
    const coupon = await db.coupon.findUnique({ where: { id } });
    if (!coupon) throw new Error('Kupon tidak ditemukan');

    return await db.coupon.update({
      where: { id },
      data: { active: !coupon.active },
    });
  }

  /**
   * Deletes a coupon (or deactivates if already used in orders)
   */
  static async deleteCoupon(id: string) {
    const coupon = await db.coupon.findUnique({
      where: { id },
      include: { _count: { select: { couponUsages: true, orders: true } } },
    });

    if (!coupon) throw new Error('Kupon tidak ditemukan');

    const totalUsage = (coupon._count.couponUsages || 0) + (coupon._count.orders || 0);

    if (totalUsage > 0) {
      // Deactivate instead of hard deleting to preserve order history integrity
      return await db.coupon.update({
        where: { id },
        data: { active: false },
      });
    }

    return await db.coupon.delete({
      where: { id },
    });
  }
}
