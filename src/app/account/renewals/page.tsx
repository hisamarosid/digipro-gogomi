import { requireAuth } from '@/lib/auth/session';
import { RenewalService } from '@/services/renewal.service';
import { SubscriptionService } from '@/services/subscription.service';
import { CustomerRenewalsClient } from './CustomerRenewalsClient';

export const dynamic = 'force-dynamic';

export default async function CustomerRenewalsPage() {
  const session = await requireAuth();

  try {
    // Auto-sync customer subscriptions from paid orders
    await SubscriptionService.syncSubscriptionsForUser(session.userId);
  } catch (err) {
    console.error('CustomerRenewalsPage auto-sync error:', err);
  }

  const overview = await RenewalService.getExpiringSubscriptionsForCustomer(session.userId);

  return (
    <CustomerRenewalsClient
      expiringSoon={overview.expiringSoon}
      activeProducts={overview.activeProducts}
      expiredProducts={overview.expiredProducts}
      renewalHistory={overview.renewalHistory}
    />
  );
}
