import React from 'react';
import { db } from '@/lib/db/prisma';
import { AdminCategoriesClient } from './AdminCategoriesClient';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  let categories: any[] = [];

  try {
    categories = await db.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  } catch {}

  return <AdminCategoriesClient categories={categories} />;
}
