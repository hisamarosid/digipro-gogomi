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

    const { ownerCredentialPlain, releaseSlotIds = [] } = body;

    if (!ownerCredentialPlain || typeof ownerCredentialPlain !== 'string' || !ownerCredentialPlain.trim()) {
      return NextResponse.json(
        { success: false, error: 'Owner Kredensial / Link baru wajib diisi' },
        { status: 400 }
      );
    }

    const updatedGroup = await InventoryReconciliationService.rotateFamilyGroupOwnerCredential(
      id,
      ownerCredentialPlain,
      releaseSlotIds,
      session.userId
    );

    return NextResponse.json({
      success: true,
      message: 'Owner kredensial berhasil diperbarui dan member slot yang dipilih telah dirilis kembali menjadi AVAILABLE!',
      data: updatedGroup,
    });
  } catch (error: any) {
    console.error('[Rotate Family Group Credential Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
