import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { MassReplacementService } from '@/services/massReplacement.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'FAMILY_GROUP_INVALID';

    const result = await MassReplacementService.invalidateFamilyGroupAndReplace(
      id,
      session.userId,
      reason
    );

    return NextResponse.json({
      success: true,
      message: `Family Group dinonaktifkan! ${result.replacedCount} anggota berhasil dipindahkan, ${result.waitingStockCount} menunggu ketersediaan grup baru.`,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
