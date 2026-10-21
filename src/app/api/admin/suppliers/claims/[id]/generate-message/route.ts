import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { SupplierClaimService } from '@/services/supplier-warranty/supplier-claim.service';

export async function GET(
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

    const claimMessage = await SupplierClaimService.generateClaimMessage(id);

    return NextResponse.json({
      success: true,
      data: {
        claimMessage,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
