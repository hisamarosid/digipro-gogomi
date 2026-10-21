import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let pref = await db.customerNotificationPreference.findUnique({
      where: { userId: session.userId },
    });

    if (!pref) {
      pref = await db.customerNotificationPreference.create({
        data: { userId: session.userId },
      });
    }

    return NextResponse.json({
      success: true,
      data: pref,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const updated = await db.customerNotificationPreference.upsert({
      where: { userId: session.userId },
      update: {
        emailOrderUpdates: Boolean(body.emailOrderUpdates ?? true),
        emailReplacements: Boolean(body.emailReplacements ?? true),
        emailCoins: Boolean(body.emailCoins ?? true),
        emailPromotions: Boolean(body.emailPromotions ?? false),
        emailSubscriptions: Boolean(body.emailSubscriptions ?? true),
        emailWaitlist: Boolean(body.emailWaitlist ?? true),
        emailPriceAlerts: Boolean(body.emailPriceAlerts ?? true),
        emailReferrals: Boolean(body.emailReferrals ?? true),
        emailSupport: Boolean(body.emailSupport ?? true),
      },
      create: {
        userId: session.userId,
        emailOrderUpdates: Boolean(body.emailOrderUpdates ?? true),
        emailReplacements: Boolean(body.emailReplacements ?? true),
        emailCoins: Boolean(body.emailCoins ?? true),
        emailPromotions: Boolean(body.emailPromotions ?? false),
        emailSubscriptions: Boolean(body.emailSubscriptions ?? true),
        emailWaitlist: Boolean(body.emailWaitlist ?? true),
        emailPriceAlerts: Boolean(body.emailPriceAlerts ?? true),
        emailReferrals: Boolean(body.emailReferrals ?? true),
        emailSupport: Boolean(body.emailSupport ?? true),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Pengaturan preference email berhasil diperbarui',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Error' }, { status: 500 });
  }
}
