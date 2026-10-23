import { describe, it, expect, vi, beforeEach } from 'vitest';

const getCurrentSession = vi.fn();
vi.mock('@/lib/auth/session', () => ({ getCurrentSession: () => getCurrentSession() }));

const userFindUnique = vi.fn();
const orderFindMany = vi.fn();
vi.mock('@/lib/db/prisma', () => ({
  db: {
    user: { findUnique: (...a: any[]) => userFindUnique(...a) },
    order: { findMany: (...a: any[]) => orderFindMany(...a) },
    $transaction: vi.fn(),
  },
}));

import { canAccessOrder } from '@/lib/auth/order-access';
import { buildOrderAccessPath } from '@/lib/utils/order-link';
import { OrderService } from '@/services/order.service';

const guestOrder = { userId: null, guestToken: 'tok_secret_123' };

describe('canAccessOrder', () => {
  beforeEach(() => getCurrentSession.mockReset());

  it('lets the holder of the private token in', async () => {
    getCurrentSession.mockResolvedValue(null);
    expect(await canAccessOrder(guestOrder, 'tok_secret_123')).toBe(true);
  });

  it('rejects a bare order number, a wrong token, or an empty token', async () => {
    getCurrentSession.mockResolvedValue(null);
    expect(await canAccessOrder(guestOrder, undefined)).toBe(false);
    expect(await canAccessOrder(guestOrder, '')).toBe(false);
    expect(await canAccessOrder(guestOrder, 'tok_secret_124')).toBe(false);
  });

  it('never lets anyone in on a token when the order has none', async () => {
    getCurrentSession.mockResolvedValue(null);
    expect(await canAccessOrder({ userId: 'u1', guestToken: null }, 'anything')).toBe(false);
  });

  it('lets the logged-in owner and staff in, but not another customer', async () => {
    const memberOrder = { userId: 'u1', guestToken: null };
    getCurrentSession.mockResolvedValue({ userId: 'u1', role: 'CUSTOMER' });
    expect(await canAccessOrder(memberOrder)).toBe(true);
    getCurrentSession.mockResolvedValue({ userId: 'u2', role: 'CUSTOMER' });
    expect(await canAccessOrder(memberOrder)).toBe(false);
    getCurrentSession.mockResolvedValue({ userId: 'u9', role: 'ORDER_STAFF' });
    expect(await canAccessOrder(memberOrder)).toBe(true);
  });
});

describe('buildOrderAccessPath', () => {
  it('adds the token for guests and omits it otherwise', () => {
    expect(buildOrderAccessPath('ORD-1', 'abc')).toBe('/payment/success?orderNumber=ORD-1&t=abc');
    expect(buildOrderAccessPath('ORD-1', null)).toBe('/payment/success?orderNumber=ORD-1');
  });
});

describe('claimGuestOrdersForUser', () => {
  beforeEach(() => {
    userFindUnique.mockReset();
    orderFindMany.mockReset();
  });

  it('does not link guest orders to an unverified account', async () => {
    userFindUnique.mockResolvedValue({ email: 'victim@gmail.com', emailVerified: null });
    const result = await OrderService.claimGuestOrdersForUser('attacker', 'victim@gmail.com');
    expect(result.claimedCount).toBe(0);
    expect(orderFindMany).not.toHaveBeenCalled();
  });

  it('does not link when the account email differs from the requested one', async () => {
    userFindUnique.mockResolvedValue({ email: 'me@gmail.com', emailVerified: new Date() });
    const result = await OrderService.claimGuestOrdersForUser('u1', 'someone-else@gmail.com');
    expect(result.claimedCount).toBe(0);
    expect(orderFindMany).not.toHaveBeenCalled();
  });

  it('looks for guest orders once the email is verified and matches', async () => {
    userFindUnique.mockResolvedValue({ email: 'me@gmail.com', emailVerified: new Date() });
    orderFindMany.mockResolvedValue([]);
    await OrderService.claimGuestOrdersForUser('u1', 'ME@gmail.com');
    expect(orderFindMany).toHaveBeenCalledTimes(1);
  });
});
