import { NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
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
      return NextResponse.json({ success: false, error: 'Produk tidak ditemukan' }, { status: 404 });
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

    return NextResponse.json({ success: true, data: { ...product, variants: variantsWithStock } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const {
      name,
      sku,
      categoryId,
      shortDesc,
      etaLabel,
      fullDesc,
      thumbnail,
      gallery,
      status,
      featured,
      bestSeller,
      variants,
      faqs,
      tutorialContent,
      termsContent,
      importantNotes,
      guideVersion,
      showGuideAfterDelivery,
      requireGuideAcknowledgement,
    } = body;

    const cleanGallery = Array.isArray(gallery)
      ? gallery.filter((img: string) => img && img.trim().length > 0)
      : [];

    const cleanFaqs = Array.isArray(faqs)
      ? faqs
          .filter((f: any) => f.question && f.question.trim().length > 0 && f.answer && f.answer.trim().length > 0)
          .map((f: any, idx: number) => ({
            question: f.question.trim(),
            answer: f.answer.trim(),
            sortOrder: idx + 1,
          }))
      : [];

    // Replace FAQs: Delete existing FAQs and re-create clean list
    await db.productFaq.deleteMany({
      where: { productId: id },
    });

    // Update Product Details
    const updatedProduct = await db.product.update({
      where: { id },
      data: {
        name,
        sku,
        shortDesc,
        etaLabel: etaLabel !== undefined ? (typeof etaLabel === 'string' && etaLabel.trim() ? etaLabel.trim().slice(0, 60) : null) : undefined,
        fullDesc,
        categoryId,
        thumbnail: thumbnail || null,
        gallery: cleanGallery,
        status,
        featured: Boolean(featured),
        bestSeller: Boolean(bestSeller),
        tutorialContent: tutorialContent !== undefined ? (tutorialContent?.trim() || null) : undefined,
        termsContent: termsContent !== undefined ? (termsContent?.trim() || null) : undefined,
        importantNotes: importantNotes !== undefined ? (importantNotes?.trim() || null) : undefined,
        guideVersion: guideVersion !== undefined ? Number(guideVersion) : undefined,
        showGuideAfterDelivery: showGuideAfterDelivery !== undefined ? Boolean(showGuideAfterDelivery) : undefined,
        requireGuideAcknowledgement: requireGuideAcknowledgement !== undefined ? Boolean(requireGuideAcknowledgement) : undefined,
        faqs: {
          create: cleanFaqs,
        },
      },
      include: {
        faqs: true,
        variants: true,
      },
    });

    // Handle Variant updates / creation / deletion if variants array is provided
    if (Array.isArray(variants) && variants.length > 0) {
      const incomingVariantIds = variants.map((v: any) => v.id).filter(Boolean);

      // Optional: Delete variants that were removed in form and have no stock/fulfillments
      if (incomingVariantIds.length > 0) {
        await db.productVariant.deleteMany({
          where: {
            productId: id,
            id: { notIn: incomingVariantIds },
            inventoryItems: { none: {} },
            orderItems: { none: {} },
          },
        });
      }

      for (const v of variants) {
        const variantData = {
          name: v.name || 'Standard',
          sku: v.sku || `${sku}-${Date.now()}`,
          price: Number(v.price) || 0,
          compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
          unitLabel: typeof v.unitLabel === 'string' && v.unitLabel.trim() ? v.unitLabel.trim().slice(0, 60) : null,
          quotaRemaining: v.quotaRemaining === '' || v.quotaRemaining == null || Number.isNaN(Number(v.quotaRemaining)) ? null : Math.max(0, Math.floor(Number(v.quotaRemaining))),
          defaultCostAmount: v.defaultCostAmount ? Number(v.defaultCostAmount) : (v.cost ? Number(v.cost) : 0),
          cost: v.cost ? Number(v.cost) : (v.defaultCostAmount ? Number(v.defaultCostAmount) : 0),
          deliveryType: v.deliveryType || 'LICENSE_KEY',
          subscriptionDays: v.subscriptionDays ? Number(v.subscriptionDays) : null,
          warrantyDays: v.warrantyDays ? Number(v.warrantyDays) : 30,
          replacementEnabled: Boolean(v.replacementEnabled),
          replacementMode: v.replacementMode || 'DISABLED',
          replacementCooldownHours: v.replacementCooldownHours ? Number(v.replacementCooldownHours) : 72,
          replacementMaxCount: v.replacementMaxCount ? Number(v.replacementMaxCount) : null,
          replacementValidityType: v.replacementValidityType || 'SUBSCRIPTION',
          replacementValidityDays: v.replacementValidityDays ? Number(v.replacementValidityDays) : 30,
          replacementRequiresReason: Boolean(v.replacementRequiresReason),
          replacementAllowWhenOutOfStockQueue: Boolean(v.replacementAllowWhenOutOfStockQueue),
          credentialExpirationEnabled: Boolean(v.credentialExpirationEnabled),
          credentialDeliveryValidityHours: v.credentialDeliveryValidityHours ? Number(v.credentialDeliveryValidityHours) : 72,
          subscriptionStartPolicy: v.subscriptionStartPolicy || 'ON_FULFILLMENT',
          deliveryModel: v.deliveryModel || 'DEDICATED_ACCOUNT',
          sharedCapacityDefault: v.sharedCapacityDefault ? Number(v.sharedCapacityDefault) : 2,
          sharedSlotLabelPrefix: v.sharedSlotLabelPrefix || 'USER',
          sharedSafetyBufferDays: v.sharedSafetyBufferDays ? Number(v.sharedSafetyBufferDays) : 2,
          sharedRequireMasterLifetimeCheck: typeof v.sharedRequireMasterLifetimeCheck === 'boolean' ? v.sharedRequireMasterLifetimeCheck : v.sharedRequireMasterLifetimeCheck !== false,
          sharedAllowSlotReuseAfterExpiration: Boolean(v.sharedAllowSlotReuseAfterExpiration),
          sharedAllowMassReplacement: typeof v.sharedAllowMassReplacement === 'boolean' ? v.sharedAllowMassReplacement : v.sharedAllowMassReplacement !== false,
          sharedExposeMasterCredentialToCustomer: typeof v.sharedExposeMasterCredentialToCustomer === 'boolean' ? v.sharedExposeMasterCredentialToCustomer : v.sharedExposeMasterCredentialToCustomer !== false,
          sharedExposeSlotPin: typeof v.sharedExposeSlotPin === 'boolean' ? v.sharedExposeSlotPin : v.sharedExposeSlotPin !== false,
          usesProfile: typeof v.usesProfile === 'boolean' ? v.usesProfile : v.usesProfile !== false,
          usesProfilePin: typeof v.usesProfilePin === 'boolean' ? v.usesProfilePin : v.usesProfilePin !== false,
        };

        if (v.id) {
          await db.productVariant.update({
            where: { id: v.id },
            data: variantData,
          });
        } else {
          await db.productVariant.create({
            data: {
              ...variantData,
              productId: id,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil diperbarui!',
      data: updatedProduct,
    });
  } catch (error: any) {
    console.error('PUT /api/admin/products/[id] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await db.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Produk berhasil dihapus!' });
  } catch (error: any) {
    console.error('DELETE /api/admin/products/[id] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
