import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { PriceWatchService } from '@/services/priceWatch.service';
import { FeatureFlagService } from '@/services/featureFlag.service';

export async function GET() {
  try {
    if (!(await FeatureFlagService.isEnabled('PRICE_ALERT'))) {
      return NextResponse.json({ success: false, error: 'FEATURE_DISABLED' }, { status: 403 });
    }

    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const data = await PriceWatchService.getUserPriceWatches(session.userId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, productVariantId, targetPrice } = await req.json();
    if (!productId || !productVariantId) {
      return NextResponse.json({ success: false, error: 'productId dan productVariantId wajib diisi' }, { status: 400 });
    }

    const watch = await PriceWatchService.createPriceWatch(session.userId, productId, productVariantId, targetPrice);
    return NextResponse.json({ success: true, data: watch });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { priceWatchId } = await req.json();
    if (!priceWatchId) {
      return NextResponse.json({ success: false, error: 'priceWatchId wajib diisi' }, { status: 400 });
    }

    await PriceWatchService.cancelPriceWatch(session.userId, priceWatchId);
    return NextResponse.json({ success: true, message: 'Price alert berhasil dibatalkan' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
