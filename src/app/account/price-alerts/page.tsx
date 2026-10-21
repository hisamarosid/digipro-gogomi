import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { PriceWatchService } from '@/services/priceWatch.service';
import { CustomerPriceAlertsClient } from './CustomerPriceAlertsClient';

export const dynamic = 'force-dynamic';

export default async function CustomerPriceAlertsPage() {
  const session = await requireAuth();
  const alerts = await PriceWatchService.getUserPriceWatches(session.userId);

  return <CustomerPriceAlertsClient initialAlerts={alerts} />;
}

