import React from 'react';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { CustomerProfileClient } from './CustomerProfileClient';

export const dynamic = 'force-dynamic';

export default async function CustomerProfilePage() {
  const session = await getCurrentSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return <CustomerProfileClient user={user} />;
}
