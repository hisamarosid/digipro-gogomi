import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { ProductGuideService } from '@/services/product-guide/product-guide.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: true, data: { items: [] } });
    }

    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber') || undefined;

    const pendingGuides = await ProductGuideService.getPendingGuideAcknowledgementsForUser(
      session.userId,
      orderNumber
    );

    return NextResponse.json({
      success: true,
      data: {
        items: pendingGuides,
        count: pendingGuides.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch pending guides' },
      { status: 500 }
    );
  }
}
