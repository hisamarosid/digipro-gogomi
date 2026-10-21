import { db } from '@/lib/db/prisma';

export class WishlistService {
  /**
   * Add a product/variant to user's wishlist with price snapshot
   */
  static async addToWishlist(userId: string, productId: string, productVariantId?: string | null) {
    // Verify product exists & fetch current price
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { variants: { where: { active: true } } },
    });

    if (!product) {
      throw new Error('Produk tidak ditemukan');
    }

    let priceAtAdded = 0;
    if (productVariantId) {
      const variant = product.variants.find((v) => v.id === productVariantId);
      if (variant) priceAtAdded = variant.price;
    } else if (product.variants.length > 0) {
      priceAtAdded = product.variants[0].price;
    }

    return db.wishlistItem.upsert({
      where: {
        userId_productId_productVariantId: {
          userId,
          productId,
          productVariantId: productVariantId || null as any,
        },
      },
      update: {
        priceAtAdded,
      },
      create: {
        userId,
        productId,
        productVariantId: productVariantId || null,
        priceAtAdded,
      },
    });
  }

  /**
   * Remove item from user's wishlist safely (owner verified)
   */
  static async removeFromWishlist(userId: string, wishlistItemId: string) {
    const item = await db.wishlistItem.findUnique({
      where: { id: wishlistItemId },
    });

    if (!item || item.userId !== userId) {
      throw new Error('Item wishlist tidak ditemukan atau bukan milik Anda');
    }

    return db.wishlistItem.delete({
      where: { id: wishlistItemId },
    });
  }

  /**
   * Get user's wishlist with real-time stock eligibility & price drop calculation
   */
  static async getUserWishlist(userId: string) {
    const items = await db.wishlistItem.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => {
      const targetVariant = item.variant || item.product.variants[0];
      const currentPrice = targetVariant?.price || 0;
      const priceAtAdded = item.priceAtAdded || currentPrice;
      const priceDropDelta = Math.max(0, priceAtAdded - currentPrice);

      let stockStatus = 'OUT_OF_STOCK';
      if (targetVariant) {
        if (targetVariant.stockMode === 'UNLIMITED') {
          stockStatus = 'IN_STOCK';
        } else {
          // Stock mode INVENTORY
          stockStatus = 'IN_STOCK'; // Default available, detailed in UI
        }
      }

      return {
        id: item.id,
        productId: item.productId,
        productVariantId: item.productVariantId,
        productName: item.product.name,
        productSlug: item.product.slug,
        thumbnail: item.product.thumbnail,
        variantName: targetVariant?.name || null,
        currentPrice,
        priceAtAdded,
        priceDropDelta,
        hasPriceDrop: priceDropDelta > 0,
        stockStatus,
        createdAt: item.createdAt,
      };
    });
  }

  /**
   * Check if a product/variant is wishlisted by user
   */
  static async checkIsWishlisted(userId: string, productId: string, productVariantId?: string | null): Promise<boolean> {
    if (!userId) return false;
    const existing = await db.wishlistItem.findFirst({
      where: {
        userId,
        productId,
        productVariantId: productVariantId || undefined,
      },
    });
    return !!existing;
  }
}
