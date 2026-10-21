import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { NotificationService } from '@/services/notification.service';
import { AdminNotificationCategory, NotificationSeverity } from '../../../../../generated/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const unresolvedOnly = searchParams.get('unresolvedOnly') === 'true';
    const severity = searchParams.get('severity') as NotificationSeverity | undefined;
    const category = searchParams.get('category') as AdminNotificationCategory | undefined;

    const data = await NotificationService.getAdminNotifications({
      userId: session.userId,
      page,
      limit,
      unreadOnly,
      unresolvedOnly,
      severity,
      category,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const { action, notificationId } = await req.json();

    if (action === 'MARK_READ') {
      await NotificationService.markAdminNotificationRead(session.userId, notificationId);
      return NextResponse.json({ success: true, message: 'Notifikasi admin ditandai dibaca' });
    }

    if (action === 'RESOLVE' && notificationId) {
      await NotificationService.resolveAdminNotification(notificationId);
      return NextResponse.json({ success: true, message: 'Isu notifikasi operasional ditandai selesai' });
    }

    if (action === 'DISMISS' && notificationId) {
      await NotificationService.dismissAdminNotification(session.userId, notificationId);
      return NextResponse.json({ success: true, message: 'Notifikasi disembunyikan' });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
