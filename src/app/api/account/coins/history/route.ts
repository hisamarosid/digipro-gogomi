import { NextResponse } from 'next/server';
import { requireVerifiedCustomer, handleAuthError } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await requireVerifiedCustomer();

    const history = await db.coinLedgerEntry.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
