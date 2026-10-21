import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession, requireAuth, requireVerifiedCustomer, handleAuthError } from '@/lib/auth/session';
import { WaitlistService } from '@/services/waitlist.service';
import { FeatureFlagService } from '@/services/featureFlag.service';
import { db } from '@/lib/db/prisma';
import { WaitlistStatus } from '../../../../../generated/prisma';

export async function GET(req: NextRequest) {
  try {
    if (!(await FeatureFlagService.isEnabled('WAITLIST'))) {
      return NextResponse.json({ success: false, error: 'FEATURE_DISABLED' }, { status: 403 });
    }

    const session = await requireVerifiedCustomer();
    const waitlists = await db.productWaitlist.findMany({
      where: { userId: session.userId },
      include: {
        variant: {
          include: { product: { select: { name: true, thumbnail: true, slug: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: waitlists });
  } catch (err: any) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const body = await req.json();
    const { productVariantId, email, action } = body;

    if (!productVariantId) {
      return NextResponse.json({ success: false, error: 'Product Variant ID wajib diisi' }, { status: 400 });
    }

    if (action === 'CANCEL') {
      const authSession = await requireAuth();
      await db.productWaitlist.updateMany({
        where: {
          userId: authSession.userId,
          productVariantId,
          status: WaitlistStatus.ACTIVE,
        },
        data: { status: WaitlistStatus.CANCELLED, unsubscribedAt: new Date() },
      });
      return NextResponse.json({ success: true, message: 'Notifikasi restock dibatalkan' });
    }

    const targetEmail = session?.email || email;
    if (!targetEmail) {
      return NextResponse.json({ success: false, error: 'Email wajib diisi' }, { status: 400 });
    }

    const entry = await WaitlistService.joinWaitlist(
      session?.userId || null,
      targetEmail,
      productVariantId
    );

    return NextResponse.json({ success: true, data: entry });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
