import React from 'react';
import { db } from '@/lib/db/prisma';
import { FamilyInventoryClient } from '@/app/admin/inventory/families/FamilyInventoryClient';

export const dynamic = 'force-dynamic';

export default async function AdminFamilyInventoryPage() {
  const [groups, familyVariants, suppliers] = await Promise.all([
    db.familyGroup.findMany({
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
        members: {
          orderBy: { slotNumber: 'asc' },
          include: {
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.productVariant.findMany({
      where: {
        deliveryModel: 'FAMILY_MEMBER',
        active: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        product: { select: { name: true } },
      },
    }),
    db.supplier.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <FamilyInventoryClient
      initialGroups={groups}
      familyVariants={familyVariants}
      suppliers={suppliers}
    />
  );
}
