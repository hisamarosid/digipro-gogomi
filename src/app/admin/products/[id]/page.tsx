import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/prisma';
import { AdminEditProductClient } from './AdminEditProductClient';

export const dynamic = 'force-dynamic';

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: {
        orderBy: { sortOrder: 'asc' },
      },
      faqs: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!product) {
    notFound();
  }

  const { SharedStockService } = await import('@/services/sharedStock.service');
  const stockMap = await SharedStockService.batchGetAvailableStock(product.variants);
  const variantsWithStock = product.variants.map((v) => {
    const stock = stockMap.get(v.id) || 0;
    return {
      ...v,
      availableStock: stock,
      availableStockCount: stock,
    };
  });

  const categories = await db.category.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return <AdminEditProductClient product={{ ...product, variants: variantsWithStock }} categories={categories} />;
}
