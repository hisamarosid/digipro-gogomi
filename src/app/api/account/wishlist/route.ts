import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedCustomer, handleAuthError } from '@/lib/auth/session';
import { WishlistService } from '@/services/wishlist.service';
import { FeatureFlagService } from '@/services/featureFlag.service';

export async function GET() {
  try {
    if (!(await FeatureFlagService.isEnabled('WISHLIST'))) {
      return NextResponse.json({ success: false, error: 'FEATURE_DISABLED' }, { status: 403 });
    }

    const session = await requireVerifiedCustomer();
    const data = await WishlistService.getUserWishlist(session.userId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireVerifiedCustomer();
    const { productId, productVariantId } = await req.json();
    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId wajib diisi' }, { status: 400 });
    }

    const item = await WishlistService.addToWishlist(session.userId, productId, productVariantId);
    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    return handleAuthError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireVerifiedCustomer();
    const { wishlistItemId } = await req.json();
    if (!wishlistItemId) {
      return NextResponse.json({ success: false, error: 'wishlistItemId wajib diisi' }, { status: 400 });
    }

    await WishlistService.removeFromWishlist(session.userId, wishlistItemId);
    return NextResponse.json({ success: true, message: 'Item berhasil dihapus dari wishlist' });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
