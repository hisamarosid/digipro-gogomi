import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/prisma';
import { formatIDR, formatDateJakarta } from '@/lib/utils/formatters';
import {
  ShoppingBag,
  User,
  CreditCard,
  Package,
  Key,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { OrderDetailAdminClient } from './OrderDetailAdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // Search by either Prisma CUID ID or Order Number
  const order = await db.order.findFirst({
    where: {
      OR: [{ id }, { orderNumber: id }],
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      items: {
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, slug: true } },
            },
          },
          fulfillments: { orderBy: { createdAt: 'desc' } },
        },
      },
      payments: { orderBy: { createdAt: 'desc' } },
      replacementRequests: { orderBy: { createdAt: 'desc' } },
      financialSnapshot: true,
    },
  });

  if (!order) {
    notFound();
  }

  return <OrderDetailAdminClient order={order} />;
}
