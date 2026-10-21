import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const {
      name,
      slug,
      rank,
      minimumSpend,
      coinRewardMultiplier,
      renewalDiscountPercentage,
      maxCoinRedemptionPercentageOverride,
      badgeLabel,
      description,
    } = body;

    const updated = await db.loyaltyTier.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        slug: slug !== undefined ? slug.toLowerCase().trim() : undefined,
        rank: rank !== undefined ? Number(rank) : undefined,
        minimumSpend: minimumSpend !== undefined ? Number(minimumSpend) : undefined,
        coinRewardMultiplier: coinRewardMultiplier !== undefined ? Number(coinRewardMultiplier) : undefined,
        renewalDiscountPercentage: renewalDiscountPercentage !== undefined ? Number(renewalDiscountPercentage) : undefined,
        maxCoinRedemptionPercentageOverride: maxCoinRedemptionPercentageOverride !== undefined ? Number(maxCoinRedemptionPercentageOverride) : undefined,
        badgeLabel: badgeLabel !== undefined ? badgeLabel : undefined,
        description: description !== undefined ? description : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await db.loyaltyTier.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Tier berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
