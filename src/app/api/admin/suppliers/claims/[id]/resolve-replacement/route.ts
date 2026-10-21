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
    const { newCredentialPayload, deliveryType, notes } = body;

    if (!newCredentialPayload || !newCredentialPayload.trim()) {
      return NextResponse.json({ success: false, error: 'CREDENTIAL_PAYLOAD_REQUIRED' }, { status: 400 });
    }

    const result = await SupplierClaimService.resolveReplacement({
      claimId: id,
      newCredentialPayload,
      deliveryType,
      notes,
      adminUserId: session.userId,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
