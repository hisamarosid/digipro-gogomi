import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedCustomer, handleAuthError } from '@/lib/auth/session';
import { RenewalService } from '@/services/renewal.service';

export async function GET(req: NextRequest) {
  try {
    const session = await requireVerifiedCustomer();
    const overview = await RenewalService.getExpiringSubscriptionsForCustomer(session.userId);
    return NextResponse.json({ success: true, data: overview });
  } catch (err: any) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireVerifiedCustomer();
    const body = await req.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json({ success: false, error: 'Subscription ID wajib diisi' }, { status: 400 });
    }

    const order = await RenewalService.createRenewalOrder(session.userId, subscriptionId);
    return NextResponse.json({ success: true, data: order });
  } catch (err: any) {
    return handleAuthError(err);
  }
}
