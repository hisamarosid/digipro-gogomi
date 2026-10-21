import React from 'react';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { formatDateJakarta } from '@/lib/utils/formatters';
import { LifeBuoy, Plus, MessageSquare } from 'lucide-react';
import { CustomerSupportClient } from './CustomerSupportClient';

export default async function CustomerSupportPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const [tickets, orders] = await Promise.all([
    db.supportTicket.findMany({
      where: { userId: session.userId },
      include: {
        order: { select: { id: true, orderNumber: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.order.findMany({
      where: { userId: session.userId },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        items: {
          select: {
            productName: true,
            variantName: true,
          },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return <CustomerSupportClient tickets={tickets} userOrders={orders} userId={session.userId} />;
}
