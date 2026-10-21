import { NextResponse } from 'next/server';
import { requireVerifiedCustomer, handleAuthError } from '@/lib/auth/session';
import { LoyaltyService } from '@/services/loyalty.service';
import { FeatureFlagService } from '@/services/featureFlag.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [flags, session] = await Promise.all([
      FeatureFlagService.getAllFlags(),
      requireVerifiedCustomer(),
    ]);

    if (!flags.STORE_COINS) {
      return NextResponse.json({ success: false, error: 'FEATURE_DISABLED' }, { status: 403 });
    }

    const [summary, settings] = await Promise.all([
      LoyaltyService.getCoinSummary(session.userId),
      LoyaltyService.getSettings(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...summary,
        enabled: settings.enabled,
        coinEarningEnabled: settings.coinEarningEnabled,
        coinRedemptionEnabled: settings.coinRedemptionEnabled,
      },
    });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
