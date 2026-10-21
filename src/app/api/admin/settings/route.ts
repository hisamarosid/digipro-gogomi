import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { SiteSettingService } from '@/services/siteSetting.service';
import { AuditService } from '@/services/audit.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const settings = await SiteSettingService.getAllSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();

    const updated = await SiteSettingService.updateSettings(body);

    await AuditService.log({
      actorId: session.userId,
      action: 'UPDATE_SITE_SETTINGS',
      entity: 'SiteSetting',
      after: {
        keysUpdated: Object.keys(body),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pengaturan website dan toko berhasil diperbarui!',
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
