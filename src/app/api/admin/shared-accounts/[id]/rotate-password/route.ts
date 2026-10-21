import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { InventoryReconciliationService } from '@/services/reconciliation.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const { credentialPlain, releaseSlotIds = [] } = body;

    if (!credentialPlain || typeof credentialPlain !== 'string' || !credentialPlain.trim()) {
      return NextResponse.json(
        { success: false, error: 'Password / Kredensial baru wajib diisi' },
        { status: 400 }
      );
    }

    const updatedAccount = await InventoryReconciliationService.rotateSharedAccountPassword(
      id,
      credentialPlain,
      releaseSlotIds,
      session.userId
    );

    return NextResponse.json({
      success: true,
      message: 'Password master berhasil diperbarui dan slot yang dipilih telah dirilis kembali menjadi AVAILABLE!',
      data: updatedAccount,
    });
  } catch (error: any) {
    console.error('[Rotate Shared Account Password Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
