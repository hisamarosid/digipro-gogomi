import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { RecentlyViewedService } from '@/services/recentlyViewed.service';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: true, data: [] });
    }

    const data = await RecentlyViewedService.getUserRecentlyViewed(session.userId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: true }); // Silent ignore for unauthenticated visitors
    }

    const { productId, productVariantId } = await req.json();
    if (productId) {
      await RecentlyViewedService.logProductView(session.userId, productId, productVariantId);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await RecentlyViewedService.clearUserRecentlyViewed(session.userId);
    return NextResponse.json({ success: true, message: 'Riwayat produk berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
