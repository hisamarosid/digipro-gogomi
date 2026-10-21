import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { SupplierClaimService } from '@/services/supplier-warranty/supplier-claim.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();
    const { channel, externalReference, notes } = body;

    if (!channel) {
      return NextResponse.json({ success: false, error: 'SUBMISSION_CHANNEL_REQUIRED' }, { status: 400 });
    }

    const updated = await SupplierClaimService.markSubmitted({
      claimId: id,
      channel,
      externalReference,
      notes,
      adminUserId: session.userId,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
