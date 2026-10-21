import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { NotificationService } from '@/services/notification.service';
import { CustomerNotificationCategory } from '../../../../../generated/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const category = searchParams.get('category') as CustomerNotificationCategory | undefined;

    const data = await NotificationService.getCustomerNotifications({
      userId: session.userId,
      page,
      limit,
      unreadOnly,
      category,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { action, notificationId } = await req.json();

    if (action === 'MARK_READ') {
      await NotificationService.markCustomerNotificationRead(session.userId, notificationId);
      return NextResponse.json({ success: true, message: 'Notifikasi ditandai dibaca' });
    }

    if (action === 'DISMISS' && notificationId) {
      await NotificationService.dismissCustomerNotification(session.userId, notificationId);
      return NextResponse.json({ success: true, message: 'Notifikasi disembunyikan' });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
