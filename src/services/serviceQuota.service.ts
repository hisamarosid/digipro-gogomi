import { db } from '@/lib/db/prisma';

/**
 * Service ("Jasa Digital") variants can have a limited number of open slots (quotaRemaining).
 * Each paid unit takes one slot; NULL means unlimited and is left untouched.
 * Best effort on purpose: a failure here must never roll back a customer's payment.
 */
export async function consumeServiceQuota(tx: Pick<typeof db, 'productVariant'>, variantId: string, quantity: number) {
  try {
    const qty = Math.max(1, Math.floor(quantity || 1));
    await tx.productVariant.updateMany({
      where: { id: variantId, quotaRemaining: { gt: 0 } },
      data: { quotaRemaining: { decrement: qty } },
    });
    await tx.productVariant.updateMany({
      where: { id: variantId, quotaRemaining: { lt: 0 } },
      data: { quotaRemaining: 0 },
    });
  } catch (err: any) {
    console.error('[ServiceQuota] consume failed:', err?.message);
  }
}
