import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/prisma';
import { PaymentClient } from './PaymentClient';

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      payments: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!order) {
    notFound();
  }

  let latestPayment = order.payments[0];

  // If order has no payment record or qrString is missing, generate real QRIS from AutoGoPay on the server
  if (!latestPayment || !latestPayment.qrString) {
    try {
      const { PaymentService } = await import('@/services/payment.service');
      await PaymentService.generateOrderQRIS(order.id);
      const reloadedOrder = await db.order.findUnique({
        where: { orderNumber },
        include: {
          items: true,
          payments: { orderBy: { createdAt: 'desc' } },
        },
      });
      if (reloadedOrder && reloadedOrder.payments.length > 0) {
        latestPayment = reloadedOrder.payments[0];
      }
    } catch (err) {
      console.error('[PaymentPage] Server-side QRIS generation error:', err);
    }
  }

  return (
    <PaymentClient
      key={`${order.orderNumber}-${latestPayment?.id || 'none'}`}
      order={order}
      payment={latestPayment}
    />
  );
}
