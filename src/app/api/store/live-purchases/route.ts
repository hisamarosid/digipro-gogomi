import { NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 14;
const MAX_ITEMS = 10;
const CACHE_TTL_MS = 60_000;

interface LivePurchase {
  name: string;
  product: string;
  at: string;
}

let cache: { at: number; data: LivePurchase[] } | null = null;

/** "Denny Luthfi Bimantoro" -> "Denny L." — never expose a customer's full name publicly. */
function maskName(raw: string | null | undefined): string {
  const parts = (raw || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Pelanggan';
  const first = parts[0].slice(0, 14);
  if (parts.length === 1) return first;
  return `${first} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

function productLabel(productName: string, variantName: string): string {
  const p = productName.trim();
  const v = variantName.trim();
  if (!v || p.toLowerCase().includes(v.toLowerCase())) return p;
  return `${p} ${v}`;
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cache.data });
    }

    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const orders = await db.order.findMany({
      where: {
        paymentStatus: 'PAID',
        status: { in: ['PAID', 'PROCESSING', 'COMPLETED', 'NEEDS_FULFILLMENT'] },
        createdAt: { gte: since },
        OR: [{ userId: null }, { user: { role: 'CUSTOMER' } }],
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_ITEMS,
      select: {
        createdAt: true,
        guestName: true,
        user: { select: { name: true } },
        items: {
          take: 1,
          orderBy: { id: 'asc' },
          select: { productName: true, variantName: true },
        },
      },
    });

    const data: LivePurchase[] = orders
      .filter((o) => o.items.length > 0)
      .map((o) => ({
        name: maskName(o.user?.name ?? o.guestName),
        product: productLabel(o.items[0].productName, o.items[0].variantName),
        at: o.createdAt.toISOString(),
      }));

    cache = { at: Date.now(), data };
    return NextResponse.json({ success: true, data });
  } catch {
    // Decorative widget: fail quietly instead of surfacing internals.
    return NextResponse.json({ success: true, data: [] });
  }
}
