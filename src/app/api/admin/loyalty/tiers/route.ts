import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { LoyaltyTierService } from '@/services/loyaltyTier.service';

export async function GET() {
  try {
    await requireAdmin();
    await LoyaltyTierService.ensureDefaultTiers();

    const tiers = await db.loyaltyTier.findMany({
      orderBy: { rank: 'asc' },
    });
    return NextResponse.json({ success: true, data: tiers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { name, slug, rank, minimumSpend, coinRewardMultiplier, renewalDiscountPercentage, badgeLabel, description } = body;

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: 'Nama dan Slug tier wajib diisi' }, { status: 400 });
    }

    const tier = await db.loyaltyTier.create({
      data: {
        name,
        slug: slug.toLowerCase().trim(),
        rank: Number(rank) || 1,
        minimumSpend: Number(minimumSpend) || 0,
        coinRewardMultiplier: Number(coinRewardMultiplier) || 1.0,
        renewalDiscountPercentage: Number(renewalDiscountPercentage) || 0,
        badgeLabel: badgeLabel || `${name} Member`,
        description,
      },
    });

    return NextResponse.json({ success: true, data: tier });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
