import { db } from '@/lib/db/prisma';

export class RecentlyViewedService {
  /**
   * Log or update product view timestamp for logged-in user
   */
  static async logProductView(userId: string, productId: string, productVariantId?: string | null) {
    if (!userId || !productId) return;

    const now = new Date();

    await db.recentlyViewedProduct.upsert({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      update: {
        productVariantId: productVariantId || null,
        viewedAt: now,
      },
      create: {
        userId,
        productId,
        productVariantId: productVariantId || null,
        viewedAt: now,
      },
    });

    // Enforce 20 max items limit per user
    const userViews = await db.recentlyViewedProduct.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      select: { id: true },
    });

    if (userViews.length > 20) {
      const itemsToDelete = userViews.slice(20).map((i) => i.id);
      await db.recentlyViewedProduct.deleteMany({
        where: { id: { in: itemsToDelete } },
      });
    }
  }

  /**
   * Get user's recently viewed products list
   */
  static async getUserRecentlyViewed(userId: string, limit = 8) {
    if (!userId) return [];

    const items = await db.recentlyViewedProduct.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            variants: {
              where: { active: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        variant: true,
      },
      orderBy: { viewedAt: 'desc' },
      take: limit,
    });

    return items.map((item) => {
      const activeVariant = item.variant || item.product.variants[0];
      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSlug: item.product.slug,
        thumbnail: item.product.thumbnail,
        price: activeVariant?.price || 0,
        compareAtPrice: activeVariant?.compareAtPrice || null,
        variantName: activeVariant?.name || null,
        viewedAt: item.viewedAt,
      };
    });
  }

  /**
   * Clear user's recently viewed browsing history
   */
  static async clearUserRecentlyViewed(userId: string) {
    if (!userId) return;
    return db.recentlyViewedProduct.deleteMany({
      where: { userId },
    });
  }
}
