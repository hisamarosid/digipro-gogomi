/**
 * Builds the private delivery-page link for an order.
 * Guests carry their secret token in `t`; members rely on their login and need no token.
 */
export function buildOrderAccessPath(orderNumber: string, guestToken?: string | null): string {
  const base = `/payment/success?orderNumber=${encodeURIComponent(orderNumber)}`;
  return guestToken ? `${base}&t=${encodeURIComponent(guestToken)}` : base;
}
