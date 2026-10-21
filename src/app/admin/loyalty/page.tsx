import React from 'react';
import { checkAdminPermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { LoyaltyService } from '@/services/loyalty.service';
import { LoyaltyTierService } from '@/services/loyaltyTier.service';
import { FeatureFlagService } from '@/services/featureFlag.service';
import { AdminLoyaltyDashboardClient } from '@/app/admin/loyalty/AdminLoyaltyDashboardClient';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export const dynamic = 'force-dynamic';

export default async function AdminLoyaltyPage() {
  const { allowed, session, requiredPermission } = await checkAdminPermission(PERMISSIONS.COIN_VIEW);

  if (!allowed) {
    return (
      <AdminAccessDenied
        title="Akses Ditolak (Loyalty Coins)"
        message="Akun Anda tidak memiliki izin untuk melihat dashboard atau mutasi Store Coins."
        userRole={session?.role}
        requiredPermission={requiredPermission}
      />
    );
  }

  await LoyaltyTierService.ensureDefaultTiers();

  const [settings, featureFlags, tiers, customers] = await Promise.all([
    LoyaltyService.getSettings(),
    FeatureFlagService.getAllFlags(),
    db.loyaltyTier.findMany({ orderBy: { rank: 'asc' } }),
    db.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
      take: 300,
    }),
  ]);

  const totalIssuedAgg = await db.coinGrant.aggregate({
    _sum: { coins: true },
  });

  const pendingAgg = await db.coinGrant.aggregate({
    where: { status: 'PENDING' },
    _sum: { coinsRemaining: true },
  });

  const availableAgg = await db.coinGrant.aggregate({
    where: { status: 'AVAILABLE', expiresAt: { gt: new Date() } },
    _sum: { coinsRemaining: true },
  });

  const reservedAgg = await db.coinReservation.aggregate({
    where: { status: 'ACTIVE' },
    _sum: { reservedCoins: true },
  });

  // 1. Direct CoinRedemption records
  const redeemedAgg = await db.coinRedemption.aggregate({
    _sum: { coinsUsed: true, currencyValue: true },
  });

  // 2. Paid Orders with coinUsed > 0 (fallback & redundancy check)
  const orderRedeemedAgg = await db.order.aggregate({
    where: {
      status: { in: ['PAID', 'COMPLETED'] },
      coinUsed: { gt: 0 },
    },
    _sum: { coinUsed: true, coinDiscountAmount: true },
  });

  // 3. REDEEM ledger entries
  const ledgerRedeemAgg = await db.coinLedgerEntry.aggregate({
    where: { type: 'REDEEM' },
    _sum: { amountCoins: true },
  });

  const expiredAgg = await db.coinGrant.aggregate({
    where: { status: 'EXPIRED' },
    _sum: { coins: true },
  });

  const initialTransactions = await db.coinLedgerEntry.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const redeemedCoins = Math.max(
    redeemedAgg._sum.coinsUsed || 0,
    orderRedeemedAgg._sum.coinUsed || 0,
    Math.abs(ledgerRedeemAgg._sum.amountCoins || 0)
  );

  const redeemedCurrencyValue = Math.max(
    redeemedAgg._sum.currencyValue || 0,
    orderRedeemedAgg._sum.coinDiscountAmount || 0,
    Math.floor(redeemedCoins * settings.currencyValuePerCoin)
  );

  const rawAvailable = availableAgg._sum.coinsRemaining || 0;
  const activeReserved = reservedAgg._sum.reservedCoins || 0;

  const metrics = {
    totalIssuedCoins: totalIssuedAgg._sum.coins || 0,
    pendingCoins: pendingAgg._sum.coinsRemaining || 0,
    availableCoins: Math.max(0, rawAvailable - activeReserved),
    reservedCoins: activeReserved,
    redeemedCoins,
    redeemedCurrencyValue,
    expiredCoins: expiredAgg._sum.coins || 0,
  };

  return (
    <AdminLoyaltyDashboardClient
      initialSettings={settings}
      initialTiers={tiers}
      customers={customers}
      featureFlags={featureFlags}
      metrics={metrics}
      initialTransactions={initialTransactions}
    />
  );
}
