import { NextResponse } from 'next/server';
import { requireVerifiedCustomer, handleAuthError } from '@/lib/auth/session';
import { LoyaltyTierService } from '@/services/loyaltyTier.service';

export async function GET() {
  try {
    const session = await requireVerifiedCustomer();
    const data = await LoyaltyTierService.getUserLoyaltyStatus(session.userId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return handleAuthError(error);
  }
}
