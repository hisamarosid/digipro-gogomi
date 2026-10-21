import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { MilestoneService } from '@/services/milestone.service';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const data = await MilestoneService.getUserMilestones(session.userId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
