import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { NotificationService } from '@/services/notification.service';
import { CustomerNotificationsClient } from './CustomerNotificationsClient';

export const dynamic = 'force-dynamic';

export default async function CustomerNotificationsPage() {
  const session = await requireAuth();

  const data = await NotificationService.getCustomerNotifications({
    userId: session.userId,
    page: 1,
    limit: 15,
  });

  return (
    <CustomerNotificationsClient
      initialNotifications={data.items}
      initialTotalPages={data.totalPages}
      initialUnreadCount={data.unreadCount}
      userRole={session.role}
    />
  );
}

