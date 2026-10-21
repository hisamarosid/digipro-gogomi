import {
  AdminNotificationCategory,
  CustomerNotificationCategory,
  NotificationSeverity,
  Role,
} from '../../../generated/prisma';

export interface SafeNotificationMetadata {
  orderNumber?: string;
  productName?: string;
  variantName?: string;
  coinAmount?: number;
  daysRemaining?: number;
  ticketNumber?: string;
  tierName?: string;
  referencePrice?: number;
  newPrice?: number;
  dropAmount?: number;
  reason?: string;
  affectedCount?: number;
  [key: string]: any;
}

export interface SendAdminEventInput {
  type: string;
  category: AdminNotificationCategory;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  dedupeKey?: string;
  metadata?: SafeNotificationMetadata;
  targetRoles?: Role[];
}

export interface SendCustomerEventInput {
  userId: string;
  type: string;
  category: CustomerNotificationCategory;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  dedupeKey?: string;
  metadata?: SafeNotificationMetadata;
}
