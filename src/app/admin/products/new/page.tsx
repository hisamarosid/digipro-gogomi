import React from 'react';
import { db } from '@/lib/db/prisma';
import { AdminNewProductClient } from './AdminNewProductClient';

export const dynamic = 'force-dynamic';

export default async function AdminNewProductPage() {
  let categories: any[] = [];
  try {
    categories = await db.category.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  } catch {}

  return <AdminNewProductClient categories={categories} />;
}
