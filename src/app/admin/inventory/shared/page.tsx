import React from 'react';
import { db } from '@/lib/db/prisma';
import { SharedInventoryClient } from '@/app/admin/inventory/shared/SharedInventoryClient';

export const dynamic = 'force-dynamic';

export default async function AdminSharedInventoryPage() {
  const accounts = await db.sharedAccount.findMany({
    include: {
      variant: {
        select: {
          id: true,
          name: true,
          sku: true,
          product: { select: { name: true } },
        },
      },
      supplier: {
        select: { id: true, name: true, code: true },
      },
      slots: {
        orderBy: { slotNumber: 'asc' },
        include: {
          assignedUser: { select: { email: true, name: true } },
          orderItem: {
            select: {
              renewalOfSubscriptionId: true,
              order: { select: { orderNumber: true, isRenewal: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const sharedVariants = await db.productVariant.findMany({
    where: {
      deliveryModel: 'SHARED_ACCOUNT',
      active: true,
    },
    select: {
      id: true,
      name: true,
      sku: true,
      product: { select: { name: true } },
    },
  });

  const suppliers = await db.supplier.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: 'asc' },
  });

  return <SharedInventoryClient initialAccounts={accounts} sharedVariants={sharedVariants} suppliers={suppliers} />;
}
