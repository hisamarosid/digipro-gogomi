import React from 'react';
import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { AdminProductsClient } from './AdminProductsClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission(PERMISSIONS.PRODUCT_VIEW);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Katalog Produk)"
        message="Akun Anda tidak memiliki izin untuk melihat atau mengedit katalog produk digital."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  let products: any[] = [];
  let categories: any[] = [];

  try {
    const rawProducts = await db.product.findMany({
      include: {
        category: { select: { name: true } },
        variants: {
          include: {
            inventoryItems: { where: { status: 'AVAILABLE' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const { SharedStockService } = await import('@/services/sharedStock.service');
    const allVariants = rawProducts.flatMap((p) => p.variants);
    const stockMap = await SharedStockService.batchGetAvailableStock(allVariants);

    products = rawProducts.map((p) => {
      const variantsWithStock = p.variants.map((v) => {
        const stock = stockMap.get(v.id) || 0;
        return {
          ...v,
          availableStock: stock,
          availableStockCount: stock,
        };
      });
      return { ...p, variants: variantsWithStock };
    });

    categories = await db.category.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch {}

  return <AdminProductsClient products={products} categories={categories} />;
}
