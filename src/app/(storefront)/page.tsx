import React from 'react';
import { db } from '@/lib/db/prisma';
import { HomePageClient } from '@/components/storefront/HomePageClient';
import { SharedStockService } from '@/services/sharedStock.service';
import { maskName } from '@/lib/utils/mask-name';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch categories, featured products, and best sellers in parallel
  const [categories, rawFeatured, rawBestSellers, rawReviews] = await Promise.all([
    db.category.findMany({
      where: { active: true },
      take: 6,
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        _count: { select: { products: { where: { status: 'ACTIVE' } } } },
      },
    }),
    db.product.findMany({
      where: { status: 'ACTIVE', featured: true },
      take: 8,
      include: {
        category: { select: { name: true, slug: true } },
        variants: {
          where: { active: true },
          orderBy: { price: 'asc' },
          select: {
            id: true,
            productId: true,
            name: true,
            sku: true,
            price: true,
            compareAtPrice: true,
            unitLabel: true,
            quotaRemaining: true,
            active: true,
            deliveryModel: true,
            subscriptionDays: true,
            sharedSafetyBufferDays: true,
          },
        },
        reviews: { where: { status: 'APPROVED' }, select: { rating: true } },
      },
    }),
    db.product.findMany({
      where: { status: 'ACTIVE', bestSeller: true },
      take: 8,
      include: {
        category: { select: { name: true, slug: true } },
        variants: {
          where: { active: true },
          orderBy: { price: 'asc' },
          select: {
            id: true,
            productId: true,
            name: true,
            sku: true,
            price: true,
            compareAtPrice: true,
            unitLabel: true,
            quotaRemaining: true,
            active: true,
            deliveryModel: true,
            subscriptionDays: true,
            sharedSafetyBufferDays: true,
          },
        },
        reviews: { where: { status: 'APPROVED' }, select: { rating: true } },
      },
    }),
    // Real, approved customer reviews only (shown on the homepage as social proof).
    db.review.findMany({
      where: { status: 'APPROVED', rating: { gte: 4 } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        rating: true,
        comment: true,
        user: { select: { name: true } },
        product: { select: { name: true } },
      },
    }),
  ]);

  const reviews = rawReviews
    .filter((r) => r.comment.trim().length > 0)
    .map((r) => ({
      rating: r.rating,
      comment: r.comment.trim(),
      author: maskName(r.user.name),
      productName: r.product.name,
    }));

  // Batch compute stock across all home page product variants
  const allVariants = [...rawFeatured.flatMap((p) => p.variants), ...rawBestSellers.flatMap((p) => p.variants)];
  const stockMap = await SharedStockService.batchGetAvailableStock(allVariants);

  const featuredProducts = rawFeatured.map((p) => ({
    ...p,
    variants: p.variants.map((v) => ({ ...v, availableStock: stockMap.get(v.id) || 0 })),
  }));

  const bestSellers = rawBestSellers.map((p) => ({
    ...p,
    variants: p.variants.map((v) => ({ ...v, availableStock: stockMap.get(v.id) || 0 })),
  }));

  return (
    <HomePageClient
      categories={categories}
      featuredProducts={featuredProducts}
      bestSellers={bestSellers}
      reviews={reviews}
    />
  );
}
