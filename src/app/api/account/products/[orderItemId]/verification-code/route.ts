import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth/session';
import { VerificationAccessService } from '@/services/verification/verification-access.service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  try {
    const session = await requireAuth();
    const { orderItemId } = await params;
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId');

    if (requestId) {
      const pollResult = await VerificationAccessService.pollVerificationCodeRequest(requestId, session.userId);
      return NextResponse.json({ success: true, data: pollResult });
    }

    const config = await VerificationAccessService.getVerificationConfigForOrderItem(orderItemId, session.userId);
    if (!config) {
      return NextResponse.json({ success: false, error: 'Item pesanan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: config });
  } catch (err: any) {
    if (err.message === 'ORDER_EXPIRED') {
      return NextResponse.json({ success: false, error: 'Masa aktif pesanan Anda telah berakhir. Permintaan kode verifikasi tidak dapat dilakukan.' }, { status: 403 });
    }
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

    const result = await VerificationAccessService.requestVerificationCode(orderItemId, session.userId, ipAddress);

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === 'ORDER_EXPIRED') {
      return NextResponse.json({ success: false, error: 'Masa aktif pesanan Anda telah berakhir. Permintaan kode verifikasi tidak dapat dilakukan.' }, { status: 403 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
    }
    return handleAuthError(err);
  }
}
