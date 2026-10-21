import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/prisma';
import { AdminTicketDetailClient } from './AdminTicketDetailClient';

export const dynamic = 'force-dynamic';

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ticket = await db.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      order: { select: { id: true, orderNumber: true } },
      messages: {
        include: { sender: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  return <AdminTicketDetailClient ticket={ticket} />;
}
