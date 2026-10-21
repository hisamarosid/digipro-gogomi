import { JobPriority, EmailJobStatus } from '../../../generated/prisma';

export type EmailMode = 'disabled' | 'development' | 'production';
export type EmailDevStrategy = 'capture' | 'redirect' | 'smtp';
export type EmailCategory =
  | 'TRANSACTIONAL'
  | 'SECURITY'
  | 'OPERATIONAL_ADMIN'
  | 'REMINDER'
  | 'LOYALTY'
  | 'SUPPORT'
  | 'MARKETING';

export interface SafeEmailTemplateData {
  customerName?: string;
  orderNumber?: string;
  productName?: string;
  variantName?: string;
  amount?: number;
  paymentMethod?: string;
  daysRemaining?: number;
  coinAmount?: number;
  coinBalance?: number;
  tierName?: string;
  ticketNumber?: string;
  verificationUrl?: string;
  resetUrl?: string;
  actionUrl?: string;
  dashboardUrl?: string;
  newPrice?: number;
  previousPrice?: number;
  reason?: string;
  [key: string]: any;
}

export interface EnqueueEmailJobInput {
  recipientUserId?: string | null;
  recipientEmail: string;
  eventType: string;
  category: EmailCategory;
  templateKey: string;
  subject: string;
  templateData?: SafeEmailTemplateData;
  entityType?: string;
  entityId?: string;
  priority?: JobPriority;
  dedupeKey?: string;
}

export interface EmailRenderResult {
  subject: string;
  html: string;
  text: string;
}

export interface EmailProviderSendResult {
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  errorMessageSafe?: string;
  isDevCaptured?: boolean;
}
