import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { ReplacementService } from '@/services/replacement/replacement-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const result = await ReplacementService.approveReplacement(id, adminSession.userId, body.adminNote);
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'APPROVE_FAILED' }, { status: 400 });
  }
}
