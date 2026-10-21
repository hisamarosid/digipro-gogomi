import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { CustomerGrowthService } from '@/services/customerGrowth.service';

export async function GET() {
  try {
    await requireAdmin();
    const data = await CustomerGrowthService.getGrowthAnalytics();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
