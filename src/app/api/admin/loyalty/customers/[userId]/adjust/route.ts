import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { LoyaltyService } from '@/services/loyalty.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireAdmin();
    const { userId } = await params;
    const body = await req.json();
    const { amountCoins, type, reason } = body;

    if (!amountCoins || Number(amountCoins) <= 0) {
      return NextResponse.json({ success: false, error: 'Jumlah coin harus lebih dari 0' }, { status: 400 });
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Alasan penyesuaian wajib diisi' }, { status: 400 });
    }

    const result = await LoyaltyService.adminAdjustCoins({
      actorId: session.userId,
      userId,
      amountCoins: Number(amountCoins),
      type: type === 'DEDUCT' ? 'DEDUCT' : 'ADD',
      reason,
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil ${type === 'DEDUCT' ? 'deduksi' : 'menambahkan'} ${amountCoins} Store Coin!`,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
