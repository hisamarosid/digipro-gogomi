import React from 'react';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { CustomerOrdersClient } from './CustomerOrdersClient';
import { OrderService } from '@/services/order.service';

export const dynamic = 'force-dynamic';

export default async function CustomerOrdersPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  // Proactively auto-claim any guest orders placed with this email
  await OrderService.claimGuestOrdersForUser(session.userId, session.email);

  const [orders, existingReviews] = await Promise.all([
    db.order.findMany({
      where: {
        OR: [
          { userId: session.userId },
          { guestEmail: session.email },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        grandTotal: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            productName: true,
            variantName: true,
            quantity: true,
            unitPrice: true,
            subtotal: true,
            variant: {
              select: { productId: true },
            },
          },
        },
        payments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { id: true, status: true, qrString: true, qrUrl: true, expiryTime: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.review.findMany({
      where: { userId: session.userId },
      select: { id: true, productId: true, rating: true, title: true, comment: true },
    }),
  ]);

  return <CustomerOrdersClient orders={orders} existingReviews={existingReviews} />;
}
