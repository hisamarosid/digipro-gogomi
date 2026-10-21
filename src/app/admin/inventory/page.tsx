import React from 'react';
import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { AdminInventoryClient } from './AdminInventoryClient';
import { CredentialExpirationService } from '@/services/expiration/credential-expiration.service';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission(PERMISSIONS.INVENTORY_VIEW);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Stok Digital)"
        message="Akun Anda tidak memiliki izin untuk melihat atau mengelola inventaris stok digital."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  try {
    // Run lazy expiration cleanup asynchronously in background without blocking GET page load
    CredentialExpirationService.expireStaleCredentials().catch((e) =>
      console.error('Lazy expiration error:', e)
    );

    const [
      variants,
      suppliers,
      inventoryItems,
      sharedAccounts,
      familyGroups,
      sharedSlotsCount,
      familySlotsCount,
    ] = await Promise.all([
      db.productVariant.findMany({
        where: { active: true },
        include: {
          product: { select: { name: true } },
          inventoryItems: true,
        },
        orderBy: { product: { name: 'asc' } },
      }),
      db.supplier.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),
      db.inventoryItem.findMany({
        include: {
          variant: {
            include: {
              product: { select: { name: true } },
            },
          },
          supplier: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: [
          { expiresAt: 'asc' },
          { createdAt: 'desc' },
        ],
        take: 200,
      }),
      db.sharedAccount.findMany({
        include: {
          variant: {
            select: { id: true, name: true, sku: true, product: { select: { name: true } } },
          },
          supplier: {
            select: { id: true, name: true, code: true },
          },
          slots: {
            orderBy: { slotNumber: 'asc' },
            include: {
              assignedUser: { select: { email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.familyGroup.findMany({
        include: {
          variant: {
            select: { id: true, name: true, sku: true, product: { select: { name: true } } },
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
      db.sharedAccountSlot.count({
        where: {
          status: 'AVAILABLE',
          sharedAccount: {
            status: { in: ['AVAILABLE', 'PARTIALLY_USED'] },
          },
        },
      }),
      db.familyMemberSlot.count({
        where: {
          status: 'AVAILABLE',
          familyGroup: {
            status: { in: ['AVAILABLE', 'PARTIALLY_USED'] },
          },
        },
      }),
    ]);

    const { SharedStockService } = await import('@/services/sharedStock.service');
    const variantStockEntries = await Promise.all(
      variants.map(async (v) => {
        try {
          const stock = await SharedStockService.getAvailableStockForVariant(v.id);
          return [v.id, stock] as const;
        } catch {
          return [v.id, 0] as const;
        }
      })
    );
    const variantStockMap: Record<string, number> = Object.fromEntries(variantStockEntries);

    return (
      <AdminInventoryClient
        variants={variants}
        suppliers={suppliers}
        initialInventoryItems={inventoryItems}
        initialSharedAccounts={sharedAccounts}
        initialFamilyGroups={familyGroups}
        sharedSlotsCount={sharedSlotsCount}
        familySlotsCount={familySlotsCount}
        variantStockMap={variantStockMap}
      />
    );
  } catch (err) {
    console.error('Failed to load inventory data:', err);
    return (
      <AdminInventoryClient
        variants={[]}
        suppliers={[]}
        initialInventoryItems={[]}
        initialSharedAccounts={[]}
        initialFamilyGroups={[]}
        sharedSlotsCount={0}
        familySlotsCount={0}
        variantStockMap={{}}
      />
    );
  }
}
