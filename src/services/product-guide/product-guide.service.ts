import { db } from '@/lib/db/prisma';
import { AuditService } from '../audit.service';

export interface ProductGuideInput {
  tutorialContent?: string | null;
  termsContent?: string | null;
  importantNotes?: string | null;
  guideVersion?: number;
  showGuideAfterDelivery?: boolean;
  requireGuideAcknowledgement?: boolean;
}

export interface OrderItemGuideResult {
  orderItemId: string;
  orderNumber: string;
  productId: string;
  productName: string;
  variantName: string;
  guideAvailable: boolean;
  guideVersion: number;
  showGuideAfterDelivery: boolean;
  requireGuideAcknowledgement: boolean;
  isAcknowledged: boolean;
  acknowledgedAt?: Date | null;
  tutorialContent: string;
  termsContent: string;
  importantNotes: string;
}

export class ProductGuideService {
  /**
   * Retrieves guide configuration for a specific product (Admin & Catalog use)
   */
  static async getGuideForProduct(productId: string) {
    try {
      const product = await (db.product as any).findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          tutorialContent: true,
          termsContent: true,
          importantNotes: true,
          guideVersion: true,
          showGuideAfterDelivery: true,
          requireGuideAcknowledgement: true,
        },
      });

      if (!product) return null;

      return {
        id: product.id,
        name: product.name,
        tutorialContent: product.tutorialContent || '',
        termsContent: product.termsContent || '',
        importantNotes: product.importantNotes || '',
        guideVersion: Number(product.guideVersion) || 1,
        showGuideAfterDelivery: Boolean(product.showGuideAfterDelivery),
        requireGuideAcknowledgement: Boolean(product.requireGuideAcknowledgement),
      };
    } catch {
      // Graceful fallback if database columns are pending migration
      return {
        id: productId,
        name: '',
        tutorialContent: '',
        termsContent: '',
        importantNotes: '',
        guideVersion: 1,
        showGuideAfterDelivery: false,
        requireGuideAcknowledgement: false,
      };
    }
  }

  /**
   * Updates guide configuration for a product (Admin only)
   */
  static async updateGuideForProduct(
    productId: string,
    input: ProductGuideInput,
    actorId?: string,
    ipAddress?: string
  ) {
    const previous = await this.getGuideForProduct(productId);

    const updatePayload: any = {
      tutorialContent: input.tutorialContent?.trim() || null,
      termsContent: input.termsContent?.trim() || null,
      importantNotes: input.importantNotes?.trim() || null,
      guideVersion: Math.max(1, input.guideVersion || 1),
      showGuideAfterDelivery: Boolean(input.showGuideAfterDelivery),
      requireGuideAcknowledgement: Boolean(input.requireGuideAcknowledgement),
    };

    const updated = await (db.product as any).update({
      where: { id: productId },
      data: updatePayload,
      select: {
        id: true,
        name: true,
        guideVersion: true,
        showGuideAfterDelivery: true,
        requireGuideAcknowledgement: true,
      },
    });

    if (actorId) {
      await AuditService.log({
        actorId,
        action: 'PRODUCT_GUIDE_UPDATED',
        entity: 'PRODUCT',
        entityId: productId,
        before: {
          guideVersion: previous?.guideVersion,
          showGuideAfterDelivery: previous?.showGuideAfterDelivery,
          requireGuideAcknowledgement: previous?.requireGuideAcknowledgement,
        },
        after: {
          guideVersion: updated.guideVersion,
          showGuideAfterDelivery: updated.showGuideAfterDelivery,
          requireGuideAcknowledgement: updated.requireGuideAcknowledgement,
        },
        ip: ipAddress,
      });
    }

    return updated;
  }

  /**
   * Snapshots current product guide version & content onto an OrderItem upon fulfillment/order creation
   */
  static async snapshotGuideToOrderItem(orderItemId: string, productId: string) {
    try {
      const guide = await this.getGuideForProduct(productId);
      if (!guide) return;

      await (db.orderItem as any).update({
        where: { id: orderItemId },
        data: {
          guideVersionSnapshot: guide.guideVersion,
          tutorialSnapshot: guide.tutorialContent || null,
          termsSnapshot: guide.termsContent || null,
          importantNotesSnapshot: guide.importantNotes || null,
          requireGuideAcknowledgementSnapshot: guide.requireGuideAcknowledgement,
        },
      });
    } catch (err: any) {
      // Non-blocking snapshot
      console.warn('[ProductGuideService] Guide snapshot skipped or schema pending:', err?.message);
    }
  }

  /**
   * Retrieves historical guide snapshot for an OrderItem with fallback to current product guide
   */
  static async getGuideForOrderItem(
    orderItemId: string,
    userId?: string
  ): Promise<OrderItemGuideResult | null> {
    const orderItem = await (db.orderItem as any).findUnique({
      where: { id: orderItemId },
      include: {
        order: { select: { id: true, userId: true, orderNumber: true, status: true, paymentStatus: true } },
        variant: {
          select: {
            id: true,
            name: true,
            productId: true,
            product: {
              select: {
                id: true,
                name: true,
                tutorialContent: true,
                termsContent: true,
                importantNotes: true,
                guideVersion: true,
                showGuideAfterDelivery: true,
                requireGuideAcknowledgement: true,
              },
            },
          },
        },
      },
    });

    if (!orderItem) return null;

    // Ownership check if userId provided
    if (userId && orderItem.order.userId !== userId) {
      throw new Error('FORBIDDEN');
    }

    const product = orderItem.variant?.product;

    // Use snapshot if present, otherwise fallback to product's current guide
    const tutorialContent = orderItem.tutorialSnapshot || product?.tutorialContent || '';
    const termsContent = orderItem.termsSnapshot || product?.termsContent || '';
    const importantNotes = orderItem.importantNotesSnapshot || product?.importantNotes || '';
    const guideVersion = orderItem.guideVersionSnapshot || product?.guideVersion || 1;

    const showGuideAfterDelivery = product?.showGuideAfterDelivery ?? false;
    const requireGuideAcknowledgement =
      orderItem.requireGuideAcknowledgementSnapshot ?? product?.requireGuideAcknowledgement ?? false;

    const isAcknowledged = Boolean(orderItem.guideAcknowledgedAt);
    const guideAvailable = Boolean(
      (tutorialContent && tutorialContent.trim().length > 0) ||
      (termsContent && termsContent.trim().length > 0)
    );

    return {
      orderItemId: orderItem.id,
      orderNumber: orderItem.order.orderNumber,
      productId: product?.id || '',
      productName: orderItem.productName || product?.name || 'Produk Digital',
      variantName: orderItem.variantName || orderItem.variant?.name || 'Standard',
      guideAvailable,
      guideVersion,
      showGuideAfterDelivery,
      requireGuideAcknowledgement,
      isAcknowledged,
      acknowledgedAt: orderItem.guideAcknowledgedAt || null,
      tutorialContent,
      termsContent,
      importantNotes,
    };
  }

  /**
   * Customer acknowledges reading the guide for an OrderItem
   */
  static async acknowledgeGuide(
    orderItemId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const orderItem = await (db.orderItem as any).findUnique({
      where: { id: orderItemId },
      include: {
        order: { select: { id: true, userId: true, orderNumber: true } },
        variant: { select: { productId: true } },
      },
    });

    if (!orderItem) {
      throw new Error('ORDER_ITEM_NOT_FOUND');
    }

    if (orderItem.order.userId !== userId) {
      throw new Error('FORBIDDEN');
    }

    const now = new Date();

    const updated = await (db.orderItem as any).update({
      where: { id: orderItemId },
      data: {
        guideAcknowledgedAt: now,
      },
      select: {
        id: true,
        guideAcknowledgedAt: true,
        guideVersionSnapshot: true,
      },
    });

    await AuditService.log({
      actorId: userId,
      action: 'PRODUCT_GUIDE_ACKNOWLEDGED',
      entity: 'ORDER_ITEM',
      entityId: orderItemId,
      after: {
        orderNumber: orderItem.order.orderNumber,
        productId: orderItem.variant?.productId,
        acknowledgedAt: now.toISOString(),
      },
      ip: ipAddress,
      userAgent,
    });

    return {
      success: true,
      orderItemId,
      acknowledgedAt: now,
    };
  }

  /**
   * Finds all pending unacknowledged guides for active fulfilled products for a user
   */
  static async getPendingGuideAcknowledgementsForUser(
    userId: string,
    orderNumberFilter?: string
  ): Promise<OrderItemGuideResult[]> {
    try {
      const orderWhere: any = {
        userId,
        status: { in: ['PAID', 'COMPLETED'] },
        paymentStatus: 'PAID',
      };

      if (orderNumberFilter) {
        orderWhere.orderNumber = orderNumberFilter;
      }

      // Query fulfillments that are genuinely ready
      const fulfillments = await (db.fulfillment as any).findMany({
        where: {
          status: { in: ['ACTIVE', 'FULFILLED'] },
          orderItem: {
            order: orderWhere,
            guideAcknowledgedAt: null,
          },
        },
        include: {
          orderItem: {
            include: {
              order: { select: { id: true, orderNumber: true } },
              variant: {
                select: {
                  id: true,
                  productId: true,
                  name: true,
                  product: {
                    select: {
                      id: true,
                      name: true,
                      tutorialContent: true,
                      termsContent: true,
                      importantNotes: true,
                      guideVersion: true,
                      showGuideAfterDelivery: true,
                      requireGuideAcknowledgement: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const results: OrderItemGuideResult[] = [];
      const seenOrderItems = new Set<string>();

      for (const f of fulfillments) {
        const item = f.orderItem;
        if (!item || seenOrderItems.has(item.id)) continue;
        seenOrderItems.add(item.id);

        const product = item.variant?.product;
        if (!product) continue;

        // Check if guide is enabled
        const showAfterDelivery = product.showGuideAfterDelivery ?? false;
        const requireAck = item.requireGuideAcknowledgementSnapshot ?? product.requireGuideAcknowledgement ?? false;

        if (!showAfterDelivery) continue;

        const tutorialContent = item.tutorialSnapshot || product.tutorialContent || '';
        const termsContent = item.termsSnapshot || product.termsContent || '';
        const importantNotes = item.importantNotesSnapshot || product.importantNotes || '';
        const guideVersion = item.guideVersionSnapshot || product.guideVersion || 1;

        const hasContent = Boolean(
          (tutorialContent && tutorialContent.trim().length > 0) ||
          (termsContent && termsContent.trim().length > 0)
        );

        if (!hasContent) continue;

        results.push({
          orderItemId: item.id,
          orderNumber: item.order.orderNumber,
          productId: product.id,
          productName: item.productName || product.name,
          variantName: item.variantName || item.variant?.name || 'Standard',
          guideAvailable: true,
          guideVersion,
          showGuideAfterDelivery: true,
          requireGuideAcknowledgement: requireAck,
          isAcknowledged: false,
          acknowledgedAt: null,
          tutorialContent,
          termsContent,
          importantNotes,
        });
      }

      return results;
    } catch {
      return [];
    }
  }
}
