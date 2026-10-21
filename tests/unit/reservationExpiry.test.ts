import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/lib/db/prisma';
import { ReservationService } from '../../src/services/reservation.service';
import {
  ReservationStatus,
  ReservationType,
  SharedAccountStatus,
  SharedSlotStatus,
} from '../../generated/prisma';

describe('Priority 1 — Resource Reservation Expiry Tests', { timeout: 30000 }, () => {
  let testVariant: any;
  let testAccount: any;
  let testSlot: any;

  beforeEach(async () => {
    await db.resourceReservation.deleteMany({ where: { orderId: { startsWith: 'ORD-RESTEST-' } } });
    await db.sharedAccountSlot.deleteMany({ where: { sharedAccount: { label: 'ADB-RESTEST-01' } } });
    await db.sharedAccount.deleteMany({ where: { label: 'ADB-RESTEST-01' } });
    await db.productVariant.deleteMany({ where: { sku: 'SKU-RESTEST-01' } });
    await db.product.deleteMany({ where: { slug: 'res-test-product' } });

    const category = await db.category.upsert({
      where: { slug: 'res-test-cat' },
      update: {},
      create: { name: 'Res Test Cat', slug: 'res-test-cat' },
    });

    const product = await db.product.create({
      data: {
        name: 'Res Test Product',
        slug: 'res-test-product',
        sku: 'PROD-RESTEST-01',
        shortDesc: 'Desc',
        fullDesc: 'Full desc',
        categoryId: category.id,
      },
    });

    testVariant = await db.productVariant.create({
      data: {
        productId: product.id,
        name: 'Res Test Shared Variant',
        sku: 'SKU-RESTEST-01',
        price: 75000,
        deliveryModel: 'SHARED_ACCOUNT',
      },
    });

    testAccount = await db.sharedAccount.create({
      data: {
        productVariantId: testVariant.id,
        label: 'ADB-RESTEST-01',
        credentialEncrypted: 'enc_test_credential',
        maxSlots: 2,
        status: SharedAccountStatus.AVAILABLE,
      },
    });

    testSlot = await db.sharedAccountSlot.create({
      data: {
        sharedAccountId: testAccount.id,
        slotNumber: 1,
        slotLabel: 'USER 1',
        status: SharedSlotStatus.AVAILABLE,
      },
    });
  });

  it('should reserve slot and restore status to AVAILABLE when payment expires', async () => {
    const orderNumber = `ORD-RESTEST-${Date.now()}`;

    const order = await db.order.create({
      data: {
        orderNumber,
        totalAmount: 75000,
        grandTotal: 75000,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
      },
    });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // 1. Reserve slot during checkout
    const reservation = await db.$transaction(async (tx) => {
      return await ReservationService.createReservation(
        tx,
        ReservationType.SHARED_SLOT_RESERVATION,
        testSlot.id,
        null,
        order.id,
        null,
        expiresAt
      );
    });

    expect(reservation.status).toBe(ReservationStatus.ACTIVE);

    const slotAfterReserve = await db.sharedAccountSlot.findUnique({
      where: { id: testSlot.id },
    });
    expect(slotAfterReserve?.status).toBe(SharedSlotStatus.RESERVED);

    // 2. Payment expires -> release reservation
    await db.$transaction(async (tx) => {
      await ReservationService.releaseReservationsForOrder(tx, order.id, 'PAYMENT_EXPIRED');
    });

    const slotAfterRelease = await db.sharedAccountSlot.findUnique({
      where: { id: testSlot.id },
    });
    expect(slotAfterRelease?.status).toBe(SharedSlotStatus.AVAILABLE);

    const resAfterRelease = await db.resourceReservation.findUnique({
      where: { id: reservation.id },
    });
    expect(resAfterRelease?.status).toBe(ReservationStatus.RELEASED);
  });
});
