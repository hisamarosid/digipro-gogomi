import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/prisma';
import { ProductDetailClient } from '@/components/storefront/ProductDetailClient';
import { SharedStockService } from '@/services/sharedStock.service';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      variants: {
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
      },
      reviews: {
        where: { status: 'APPROVED' },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      faqs: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!product || product.status !== 'ACTIVE') {
    notFound();
  }

  const stockMap = await SharedStockService.batchGetAvailableStock(product.variants);

  const variantsWithStock = product.variants.map((v) => ({
    ...v,
    availableStock: stockMap.get(v.id) || 0,
  }));

  const serializedProduct = {
    ...product,
    variants: variantsWithStock,
  };

  // Increment viewCount non-blockingly without delaying page render
  db.product.update({
    where: { id: product.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  return <ProductDetailClient product={{ ...serializedProduct, viewCount: product.viewCount + 1 }} />;
}
