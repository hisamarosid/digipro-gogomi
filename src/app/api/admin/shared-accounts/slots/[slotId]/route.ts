import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { SharedAccountService } from '@/services/sharedAccount.service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const session = await requirePermission(PERMISSIONS.INVENTORY_UPDATE);
    const { slotId } = await params;
    const body = await req.json();

    const result = await SharedAccountService.updateSlotProfile(
      slotId,
      {
        slotLabel: body.slotLabel,
        pin: body.pin,
        status: body.status,
      },
      session.userId,
      !!body.force
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          warning: result.warning,
          message: result.message,
        },
        { status: result.warning ? 409 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile slot berhasil diperbarui!',
      data: result.slot,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
