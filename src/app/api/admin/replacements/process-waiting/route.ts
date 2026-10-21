import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { ReplacementService } from '@/services/replacement/replacement-service';

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdmin();
    const result = await ReplacementService.processWaitingQueue(adminSession.userId);
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'PROCESS_WAITING_FAILED' }, { status: 400 });
  }
}
