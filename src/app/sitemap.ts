import { MetadataRoute } from 'next';
import { db } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  let productUrls: any[] = [];
  let categoryUrls: any[] = [];

  try {
    const products = await db.product.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true, updatedAt: true },
    });

    const categories = await db.category.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    });

    productUrls = products.map((p) => ({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: p.updatedAt,
    }));

    categoryUrls = categories.map((c) => ({
      url: `${baseUrl}/products?category=${c.slug}`,
      lastModified: c.updatedAt,
    }));
  } catch {
    // Offline DB during build step fallback
  }

  return [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/products`, lastModified: new Date() },
    { url: `${baseUrl}/help`, lastModified: new Date() },
    { url: `${baseUrl}/faq`, lastModified: new Date() },
    { url: `${baseUrl}/terms`, lastModified: new Date() },
    { url: `${baseUrl}/privacy`, lastModified: new Date() },
    { url: `${baseUrl}/refund-policy`, lastModified: new Date() },
    ...productUrls,
    ...categoryUrls,
  ];
}
