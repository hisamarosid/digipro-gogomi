import { NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';

export async function GET() {
  try {
    await requireAdmin();
    const products = await db.product.findMany({
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const { SharedStockService } = await import('@/services/sharedStock.service');
    const allVariants = products.flatMap((p) => p.variants);
    const stockMap = await SharedStockService.batchGetAvailableStock(allVariants);

    const data = products.map((p) => ({
      ...p,
      variants: p.variants.map((v) => {
        const stock = stockMap.get(v.id) || 0;
        return {
          ...v,
          availableStock: stock,
          availableStockCount: stock,
        };
      }),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      name,
      sku,
      categoryId,
      shortDesc,
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

    if (!name || !sku || !categoryId || !shortDesc || !fullDesc) {
      return NextResponse.json(
        { success: false, error: 'Silakan isi semua field wajib (Nama, SKU, Kategori, Deskripsi).' },
        { status: 400 }
      );
    }

    // Generate unique slug
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    // Clean gallery array (filter out empty strings)
    const cleanGallery = Array.isArray(gallery)
      ? gallery.filter((img: string) => img && img.trim().length > 0)
      : [];

    // Filter out empty FAQs
    const cleanFaqs = Array.isArray(faqs)
      ? faqs
          .filter((f: any) => f.question && f.question.trim().length > 0 && f.answer && f.answer.trim().length > 0)
          .map((f: any, idx: number) => ({
            question: f.question.trim(),
            answer: f.answer.trim(),
            sortOrder: idx + 1,
          }))
      : [];

    // Construct variants array
    const defaultVariants = Array.isArray(variants) && variants.length > 0
      ? variants
      : [
          {
            name: 'Lisensi Standard',
            sku: `${sku}-STD`,
            price: 50000,
            compareAtPrice: 100000,
            deliveryType: 'LICENSE_KEY',
            warrantyDays: 30,
          },
        ];

    // Create product in Database
    const product = await db.product.create({
      data: {
        name,
        slug,
        sku,
        shortDesc,
        fullDesc,
        categoryId,
        thumbnail: thumbnail || null,
        gallery: cleanGallery,
        status: status || 'ACTIVE',
        featured: Boolean(featured),
        bestSeller: Boolean(bestSeller),
        tutorialContent: tutorialContent?.trim() || null,
        termsContent: termsContent?.trim() || null,
        importantNotes: importantNotes?.trim() || null,
        guideVersion: guideVersion ? Number(guideVersion) : 1,
        showGuideAfterDelivery: Boolean(showGuideAfterDelivery),
        requireGuideAcknowledgement: Boolean(requireGuideAcknowledgement),
        faqs: {
          create: cleanFaqs,
        },
        variants: {
          create: defaultVariants.map((v: any) => ({
            name: v.name || 'Standard',
            sku: v.sku || `${sku}-${Date.now()}`,
            price: Number(v.price) || 0,
            compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
            defaultCostAmount: v.defaultCostAmount ? Number(v.defaultCostAmount) : (v.cost ? Number(v.cost) : 0),
            deliveryType: v.deliveryType || 'LICENSE_KEY',
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
          })),
        },
      },
      include: {
        faqs: true,
        variants: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Produk digital berhasil dibuat!',
      data: product,
    });
  } catch (error: any) {
    console.error('POST /api/admin/products error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
