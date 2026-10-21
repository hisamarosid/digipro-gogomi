import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { CustomerWaitlistClient } from './CustomerWaitlistClient';

export default async function CustomerWaitlistPage() {
  const session = await requireAuth();

  const waitlists = await db.productWaitlist.findMany({
    where: { userId: session.userId },
    include: {
      variant: {
        include: { product: { select: { name: true, slug: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <CustomerWaitlistClient initialWaitlists={waitlists} />
    </div>
  );
}
