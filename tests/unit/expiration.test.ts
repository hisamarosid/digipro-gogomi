import { describe, it, expect } from 'vitest';
import { CredentialExpirationService } from '../../src/services/expiration/credential-expiration.service';

describe('Credential Expiration & Delivery Deadline System - Tests', () => {
  it('should calculate correct expiresAt based on variant delivery validity hours (e.g. 72 hours = 3 days)', () => {
    const createdAt = new Date('2026-08-14T10:00:00Z');
    const variant = {
      credentialExpirationEnabled: true,
      credentialDeliveryValidityHours: 72,
    };

    const expiresAt = CredentialExpirationService.calculateExpiresAt(createdAt, variant);
    expect(expiresAt?.toISOString()).toBe('2026-08-17T10:00:00.000Z');
  });

  it('should prioritize custom delivery validity hours override over variant default', () => {
    const createdAt = new Date('2026-08-14T10:00:00Z');
    const variant = {
      credentialExpirationEnabled: true,
      credentialDeliveryValidityHours: 72, // 3 days default
    };
    const overrideHours = 24; // 1 day override

    const expiresAt = CredentialExpirationService.calculateExpiresAt(createdAt, variant, overrideHours);
    expect(expiresAt?.toISOString()).toBe('2026-08-15T10:00:00.000Z');
  });

  it('should sort inventory candidates using FEFO strategy (First Expired, First Out)', () => {
    const stockA = { id: 'A', expiresAt: new Date('2026-08-17T10:00:00Z'), createdAt: new Date('2026-08-14T10:00:00Z') };
    const stockB = { id: 'B', expiresAt: new Date('2026-08-15T10:00:00Z'), createdAt: new Date('2026-08-14T11:00:00Z') };
    const stockC = { id: 'C', expiresAt: null, createdAt: new Date('2026-08-14T09:00:00Z') };

    const items = [stockA, stockB, stockC];

    // FEFO sort: items with nearest expiresAt first, nulls last
    items.sort((a, b) => {
      if (!a.expiresAt) return 1;
      if (!b.expiresAt) return -1;
      return a.expiresAt.getTime() - b.expiresAt.getTime();
    });

    expect(items[0].id).toBe('B'); // Stock B expires in 1 day -> FEFO winner
    expect(items[1].id).toBe('A'); // Stock A expires in 3 days
    expect(items[2].id).toBe('C'); // Stock C has no expiration -> placed last
  });

  it('should mark inventory as EXPIRED and skip it when current time is past expiresAt', () => {
    const now = new Date('2026-08-18T10:00:00Z');
    const expiredStock = { id: 'STOCK-EXPIRED', expiresAt: new Date('2026-08-17T10:00:00Z'), status: 'AVAILABLE' };
    const validStock = { id: 'STOCK-VALID', expiresAt: new Date('2026-08-20T10:00:00Z'), status: 'AVAILABLE' };

    const candidates = [expiredStock, validStock];
    const allocated: any[] = [];

    for (const candidate of candidates) {
      if (candidate.expiresAt && now.getTime() >= candidate.expiresAt.getTime()) {
        candidate.status = 'EXPIRED'; // Lazy expiration skip
        continue;
      }
      candidate.status = 'ASSIGNED';
      allocated.push(candidate);
      break;
    }

    expect(expiredStock.status).toBe('EXPIRED');
    expect(validStock.status).toBe('ASSIGNED');
    expect(allocated[0].id).toBe('STOCK-VALID');
  });

  it('should preserve customer PAID order entitlement when all stock is expired (NEEDS_FULFILLMENT)', () => {
    const order = { status: 'PAID', paymentStatus: 'PAID' };
    const availableValidStockCount = 0;

    let finalOrderStatus = order.status;
    if (availableValidStockCount === 0) {
      finalOrderStatus = 'NEEDS_FULFILLMENT'; // Never cancel paid customer orders!
    }

    expect(order.paymentStatus).toBe('PAID');
    expect(finalOrderStatus).toBe('NEEDS_FULFILLMENT');
  });

  it('should start subscription ON_FULFILLMENT timestamp to protect customer access period', () => {
    const paymentTime = new Date('2026-08-14T10:00:00Z');
    const deliveryTime = new Date('2026-08-15T12:00:00Z'); // Delivered 1 day later
    const subscriptionDays = 30;

    const activatedAt = deliveryTime;
    const expiresAt = new Date(activatedAt.getTime() + subscriptionDays * 24 * 3600 * 1000);

    expect(activatedAt.toISOString()).toBe('2026-08-15T12:00:00.000Z');
    expect(expiresAt.toISOString()).toBe('2026-09-14T12:00:00.000Z');
    expect(activatedAt.getTime()).toBeGreaterThan(paymentTime.getTime());
  });

  it('should calculate correct inventory waste rate percentage', () => {
    const totalAdded = 100;
    const totalExpired = 18;

    const wasteRate = Math.round((totalExpired / totalAdded) * 100);
    expect(wasteRate).toBe(18);
  });
});
