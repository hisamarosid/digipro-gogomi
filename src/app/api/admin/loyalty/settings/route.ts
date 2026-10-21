import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { LoyaltyService } from '@/services/loyalty.service';

export async function GET() {
  try {
    await requireAdmin();
    const settings = await LoyaltyService.getSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const updated = await LoyaltyService.updateSettings(body, session.userId);

    return NextResponse.json({
      success: true,
      message: 'Pengaturan Loyalty Coin berhasil diperbarui!',
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
