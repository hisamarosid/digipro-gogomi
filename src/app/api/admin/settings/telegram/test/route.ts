import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireSuperAdmin } from '@/lib/auth/session';
import { TelegramService } from '@/services/telegram.service';
import { Role } from '@/../generated/prisma';

export async function POST(req: NextRequest) {
  try {
    // Only SUPER_ADMIN can send test telegram notification
    const session = await requireAdmin([Role.SUPER_ADMIN]);

    const result = await TelegramService.sendTestNotification(session.email || session.name || 'Super Admin');

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Gagal mengirim pesan test ke Telegram Bot.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pesan test Telegram berhasil dikirim ke Admin Chat ID!',
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Akses hanya untuk Super Admin' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 });
  }
}
