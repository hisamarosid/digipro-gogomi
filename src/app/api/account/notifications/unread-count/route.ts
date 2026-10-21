import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { NotificationService } from '@/services/notification.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const count = await NotificationService.getUnreadCustomerCount(session.userId);
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
