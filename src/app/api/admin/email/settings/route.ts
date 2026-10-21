import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { EmailProviderService } from '@/services/email/email-provider.service';
import { AuditService } from '@/services/audit.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.SETTINGS_VIEW);
    const settings = await EmailProviderService.getGlobalEmailSettings();
    const smtpHealth = await EmailProviderService.verifySmtpConnection();

    return NextResponse.json({
      success: true,
      data: {
        ...settings,
        smtpHealth,
      },
    });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: err?.message || 'Unauthorized' },
      { status: 401 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePermission(PERMISSIONS.EMAIL_SETTINGS_MANAGE);

    const body = await req.json();
    const { mode, sendEnabled, devStrategy, devRedirectTo, fromName, fromAddress, replyTo } = body;

    const previous = await db.globalEmailSettings.findUnique({ where: { id: 'default' } });

    const updated = await db.globalEmailSettings.upsert({
      where: { id: 'default' },
      update: {
        mode,
        sendEnabled: Boolean(sendEnabled),
        devStrategy,
        devRedirectTo,
        fromName,
        fromAddress,
        replyTo,
      },
      create: {
        id: 'default',
        mode: mode || 'development',
        sendEnabled: Boolean(sendEnabled),
        devStrategy: devStrategy || 'capture',
        devRedirectTo: devRedirectTo || '',
        fromName: fromName || 'Gogomi Store',
        fromAddress: fromAddress || 'no-reply@gogomi.store',
        replyTo: replyTo || 'support@gogomi.store',
      },
    });

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    await AuditService.log({
      actorId: session.userId,
      action: 'SYSTEM_SETTING_CHANGED',
      entity: 'GLOBAL_EMAIL_SETTINGS',
      entityId: 'default',
      before: previous || {},
      after: updated,
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Pengaturan Email Global berhasil diperbarui',
    });
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Akses Ditolak: Anda memerlukan izin "email-settings:manage"' }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui pengaturan' },
      { status: 400 }
    );
  }
}
