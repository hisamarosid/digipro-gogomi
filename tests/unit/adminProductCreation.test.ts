import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db/prisma';

describe('Admin Product Creation Page Tests (/admin/products/new)', () => {
  let category: any;

  beforeEach(async () => {
    category = await db.category.create({
      data: {
        name: `Digital Apps ${Date.now()}`,
        slug: `digi-app-${Date.now()}`,
        active: true,
      },
    });
  });

  it('1. Should successfully create product with multiple variants, media, and shared account settings', async () => {
    const sku = `CNV-TST-${Date.now().toString().slice(-4)}`;
    const product = await db.product.create({
      data: {
        name: `Canva Pro Test ${Date.now()}`,
        slug: `canva-pro-test-${Date.now()}`,
        sku,
        categoryId: category.id,
        shortDesc: 'Canva Pro 1 Tahun Garansi Penuh',
        fullDesc: 'Deskripsi lengkap Canva Pro dengan akses Brand Kit dan Remove Background.',
        thumbnail: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=500',
        gallery: ['https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1000'],
        status: 'ACTIVE',
        featured: true,
        bestSeller: true,
        variants: {
          create: [
            {
              name: 'Shared Profile 1 User',
              sku: `${sku}-V1`,
              price: 25000,
              compareAtPrice: 65000,
              defaultCostAmount: 10000,
              deliveryType: 'ACCOUNT',
              deliveryModel: 'SHARED_ACCOUNT',
              warrantyDays: 30,
              sharedCapacityDefault: 5,
              sharedSlotLabelPrefix: 'PROFILE',
              sharedSafetyBufferDays: 2,
              sharedRequireMasterLifetimeCheck: true,
              sharedExposeMasterCredentialToCustomer: true,
              sharedExposeSlotPin: true,
              replacementEnabled: true,
              replacementMode: 'AUTO',
              replacementCooldownHours: 24,
              replacementMaxCount: 3,
            },
            {
              name: 'Private Dedicated Account',
              sku: `${sku}-V2`,
              price: 150000,
              compareAtPrice: 200000,
              defaultCostAmount: 80000,
              deliveryType: 'ACCOUNT',
              deliveryModel: 'DEDICATED_ACCOUNT',
              warrantyDays: 365,
              replacementEnabled: true,
              replacementMode: 'AUTO',
              replacementCooldownHours: 48,
            },
          ],
        },
        faqs: {
          create: [
            {
              question: 'Apakah produk ini garansi resmi?',
              answer: 'Ya, garansi 100% penuh penggantian akun baru.',
              sortOrder: 1,
            },
          ],
        },
      },
      include: {
        variants: true,
        faqs: true,
      },
    });

    expect(product).toBeDefined();
    expect(product.variants.length).toBe(2);
    expect(product.faqs.length).toBe(1);
    expect(product.variants[0].deliveryModel).toBe('SHARED_ACCOUNT');
    expect(product.variants[0].sharedCapacityDefault).toBe(5);
    expect(product.variants[1].deliveryModel).toBe('DEDICATED_ACCOUNT');
  });
});
