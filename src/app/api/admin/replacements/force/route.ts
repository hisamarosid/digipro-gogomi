import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { ReplacementService } from '@/services/replacement/replacement-service';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdmin();
    if (adminSession.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN_SUPER_ADMIN_ONLY' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.orderItemId || !body.reason) {
      return NextResponse.json({ error: 'orderItemId dan reason wajib diisi' }, { status: 400 });
    }

    const result = await ReplacementService.forceReplacement(
      body.orderItemId,
      adminSession.userId,
      body.reason,
      body.adminNote
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'FORCE_REPLACEMENT_FAILED' }, { status: 400 });
  }
}
