import crypto from 'crypto';
import { getCurrentSession } from './session';

/** Staff roles that may open any order (same set as requireAdmin's default). */
const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ORDER_STAFF', 'SUPPORT', 'EDITOR'];

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Who may see an order's delivery details (credentials, invoice)?
 * - staff
 * - the logged-in owner of the order
 * - anyone holding the order's secret guest token (sent only to the buyer's email / kept in their browser)
 * An order number alone is never enough.
 */
export async function canAccessOrder(
  order: { userId: string | null; guestToken: string | null },
  token?: string | null
): Promise<boolean> {
  const session = await getCurrentSession();
  if (session) {
    if (STAFF_ROLES.includes(session.role as string)) return true;
    if (order.userId && order.userId === session.userId) return true;
  }
  if (order.guestToken && token && safeEqual(order.guestToken, token)) return true;
  return false;
}

export { buildOrderAccessPath } from '@/lib/utils/order-link';
