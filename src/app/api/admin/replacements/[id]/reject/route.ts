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
    const body = await req.json();

    if (!body.reason) {
      return NextResponse.json({ error: 'Alasan penolakan wajib diisi' }, { status: 400 });
    }

    const result = await ReplacementService.rejectReplacement(
      id,
      adminSession.userId,
      body.reason,
      body.adminNote
    );
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'REJECT_FAILED' }, { status: 400 });
  }
}
