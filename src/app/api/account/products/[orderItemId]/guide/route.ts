import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth/session';
import { ProductGuideService } from '@/services/product-guide/product-guide.service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  try {
    const session = await requireAuth();
    const { orderItemId } = await params;

    const guide = await ProductGuideService.getGuideForOrderItem(orderItemId, session.userId);

    if (!guide) {
      return NextResponse.json(
        { success: false, error: 'Panduan produk tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: guide,
    });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
    }
    return handleAuthError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  try {
    const session = await requireAuth();
    const { orderItemId } = await params;

    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const result = await ProductGuideService.acknowledgeGuide(
      orderItemId,
      session.userId,
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: 'Panduan dan S&K produk berhasil disetujui.',
      data: result,
    });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
    }
    if (err.message === 'ORDER_ITEM_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Item pesanan tidak ditemukan' }, { status: 404 });
    }
    return handleAuthError(err);
  }
}
