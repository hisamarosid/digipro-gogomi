import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { SecureCredentialRevealService } from '@/services/supplier-warranty/secure-credential-reveal.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED_REVEAL' }, { status: 403 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();
    const { inventoryId, reason } = body;

    if (!inventoryId) {
      return NextResponse.json({ success: false, error: 'INVENTORY_ID_REQUIRED' }, { status: 400 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const result = await SecureCredentialRevealService.revealBrokenCredential({
      adminUserId: session.userId,
      inventoryId,
      supplierClaimId: id,
      reason: reason || 'Supplier Warranty Verification',
      ipAddress: clientIp,
      userAgent,
    });

    const response = NextResponse.json({ success: true, data: result });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return response;
  } catch (error: any) {
    console.error('[Admin Claim Reveal Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
}
