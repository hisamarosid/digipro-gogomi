import { db } from '@/lib/db/prisma';
import { ProductStatus } from '../../generated/prisma';
import { LoyaltyTierService } from './loyaltyTier.service';

export class RecommendationService {
  /**
   * Get personalized product recommendations for a customer
   */
  static async getRecommendationsForUser(userId?: string | null, limit = 6) {
    let userTierRank = 1;
    if (userId) {
      const benefits = await LoyaltyTierService.getTierBenefits(userId);
      userTierRank = benefits.rank;
    }

    // Fetch active products with active variants
    const allProducts = await db.product.findMany({
      where: { status: ProductStatus.ACTIVE },
      include: {
        category: true,
        variants: {
          where: {
            active: true,
            minimumLoyaltyTierRank: { lte: userTierRank },
          },
          orderBy: { price: 'asc' },
        },
      },
      orderBy: [
        { soldCount: 'desc' },
        { viewCount: 'desc' },
      ],
      take: 20,
    });

    // Filter products with at least 1 purchasable variant
    const validProducts = allProducts.filter((p) => p.variants.length > 0);

    if (!userId) {
      return validProducts.slice(0, limit).map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        thumbnail: p.thumbnail,
        shortDesc: p.shortDesc,
        categoryName: p.category.name,
        startingPrice: p.variants[0].price,
        compareAtPrice: p.variants[0].compareAtPrice,
        score: p.soldCount * 2 + p.viewCount,
      }));
    }

    // Fetch user purchase categories
    const userOrders = await db.order.findMany({
      where: { userId },
      select: {
        items: {
          select: { variantId: true },
        },
      },
    });

    const userWishlist = await db.wishlistItem.findMany({
      where: { userId },
      select: { productId: true },
    });

    const userRecent = await db.recentlyViewedProduct.findMany({
      where: { userId },
      select: { productId: true },
    });

    const wishlistedIds = new Set(userWishlist.map((w) => w.productId));
    const recentIds = new Set(userRecent.map((r) => r.productId));

    // Score products deterministically
    const scored = validProducts.map((p) => {
      let score = p.soldCount * 2 + p.viewCount;
      if (wishlistedIds.has(p.id)) score += 50;
      if (recentIds.has(p.id)) score += 30;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        thumbnail: p.thumbnail,
        shortDesc: p.shortDesc,
        categoryName: p.category.name,
        startingPrice: p.variants[0].price,
        compareAtPrice: p.variants[0].compareAtPrice,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /**
   * Get related products for a product detail page
   */
  static async getRelatedProducts(productId: string, limit = 4) {
    const currentProduct = await db.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    });

    if (!currentProduct) return [];

    const related = await db.product.findMany({
      where: {
        id: { not: productId },
        categoryId: currentProduct.categoryId,
        status: ProductStatus.ACTIVE,
      },
      include: {
        category: true,
        variants: {
          where: { active: true },
          orderBy: { price: 'asc' },
        },
      },
      orderBy: { soldCount: 'desc' },
      take: limit,
    });

    return related.filter((p) => p.variants.length > 0).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      thumbnail: p.thumbnail,
      shortDesc: p.shortDesc,
      categoryName: p.category.name,
      startingPrice: p.variants[0].price,
      compareAtPrice: p.variants[0].compareAtPrice,
    }));
  }
}
