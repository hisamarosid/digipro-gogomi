import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { SharedAccountService } from '@/services/sharedAccount.service';
import { formatRevealedPayload } from '@/lib/security/encryption';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const session = await requirePermission(PERMISSIONS.INVENTORY_VIEW_SENSITIVE);
    const { slotId } = await params;

    const result = await SharedAccountService.revealSlotPin(slotId, session.userId);

    return NextResponse.json({
      success: true,
      pin: result.pin ? formatRevealedPayload(result.pin) : result.pin,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
}
