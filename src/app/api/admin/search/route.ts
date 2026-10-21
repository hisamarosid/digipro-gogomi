import { NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          orders: [],
          customers: [],
          products: [],
          inventory: [],
          replacements: [],
          supportTickets: [],
          suppliers: [],
          totalResults: 0,
        },
      });
    }

    const [
      orders,
      customers,
      products,
      inventory,
      replacements,
      supportTickets,
      suppliers,
    ] = await Promise.all([
      // 1. Orders
      db.order.findMany({
        where: {
          OR: [
            { orderNumber: { contains: query } },
            { guestEmail: { contains: query } },
            { guestName: { contains: query } },
            { user: { name: { contains: query } } },
            { user: { email: { contains: query } } },
          ],
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          grandTotal: true,
          createdAt: true,
          guestName: true,
          guestEmail: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),

      // 2. Customers / Users
      db.user.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
            { referralCode: { contains: query } },
          ],
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          referralCode: true,
          createdAt: true,
          customerLoyaltyTier: { select: { tier: { select: { name: true } } } },
        },
      }),

      // 3. Products
      db.product.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { slug: { contains: query } },
            { sku: { contains: query } },
            { category: { name: { contains: query } } },
          ],
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          category: { select: { name: true } },
          variants: { select: { price: true }, take: 1 },
        },
      }),

      // 4. Inventory Items / Credentials
      db.inventoryItem.findMany({
        where: {
          OR: [
            { id: { contains: query } },
            { variant: { product: { name: { contains: query } } } },
          ],
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          variant: { select: { product: { select: { name: true } } } },
        },
      }),

      // 5. Auto Replacements
      db.replacementRequest.findMany({
        where: {
          OR: [
            { id: { contains: query } },
            { requestNumber: { contains: query } },
            { order: { orderNumber: { contains: query } } },
            { user: { name: { contains: query } } },
            { user: { email: { contains: query } } },
          ],
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          requestNumber: true,
          status: true,
          createdAt: true,
          order: { select: { orderNumber: true } },
          user: { select: { name: true, email: true } },
        },
      }),

      // 6. Support Tickets
      db.supportTicket.findMany({
        where: {
          OR: [
            { ticketNumber: { contains: query } },
            { subject: { contains: query } },
            { user: { name: { contains: query } } },
            { user: { email: { contains: query } } },
          ],
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          priority: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),

      // 7. Suppliers
      db.supplier.findMany({
        where: {
          OR: [
            { code: { contains: query } },
            { name: { contains: query } },
            { email: { contains: query } },
          ],
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          code: true,
          name: true,
          email: true,
          status: true,
        },
      }),
    ]);

    const totalResults =
      orders.length +
      customers.length +
      products.length +
      inventory.length +
      replacements.length +
      supportTickets.length +
      suppliers.length;

    return NextResponse.json({
      success: true,
      data: {
        orders: orders.map((o) => ({
          id: o.id,
          title: `#${o.orderNumber}`,
          subtitle: `Customer: ${o.user?.name || o.guestName} (${o.user?.email || o.guestEmail})`,
          amount: `Rp${o.grandTotal.toLocaleString('id-ID')}`,
          status: o.status,
          date: o.createdAt,
          url: `/admin/orders/${o.id}`,
        })),
        customers: customers.map((c) => ({
          id: c.id,
          title: c.name,
          subtitle: `${c.email} • ${c.role} ${c.customerLoyaltyTier?.tier ? `(${c.customerLoyaltyTier.tier.name})` : ''}`,
          badge: c.referralCode ? `Ref: ${c.referralCode}` : undefined,
          date: c.createdAt,
          url: `/admin/customers/${c.id}`,
        })),
        products: products.map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: `Kategori: ${p.category?.name || 'Uncategorized'}`,
          badge: p.status,
          url: `/admin/products/${p.id}`,
        })),
        inventory: inventory.map((i) => ({
          id: i.id,
          title: i.variant?.product?.name || `Inventory ID: ${i.id.substring(0, 10)}...`,
          subtitle: `ID: ${i.id} • Tipe: ${i.type}`,
          badge: i.status,
          url: `/admin/inventory?q=${encodeURIComponent(query)}`,
        })),
        replacements: replacements.map((r) => ({
          id: r.id,
          title: `#${r.requestNumber || r.id.substring(0, 8)}`,
          subtitle: `Order: #${r.order?.orderNumber || 'N/A'} • User: ${r.user?.name || 'N/A'}`,
          badge: r.status,
          url: `/admin/replacements?q=${encodeURIComponent(query)}`,
        })),
        support: supportTickets.map((s) => ({
          id: s.id,
          title: `#${s.ticketNumber} — ${s.subject}`,
          subtitle: `Customer: ${s.user?.name} (${s.user?.email}) • Status: ${s.status}`,
          badge: s.priority,
          url: `/admin/support/${s.id}`,
        })),
        suppliers: suppliers.map((sup) => ({
          id: sup.id,
          title: `[${sup.code}] ${sup.name}`,
          subtitle: `Email: ${sup.email || 'N/A'}`,
          badge: sup.status,
          url: `/admin/suppliers/${sup.id}`,
        })),
        totalResults,
      },
    });
  } catch (error: any) {
    console.error('[Admin Search API Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
