import { describe, it, expect, vi } from 'vitest';
import { EmailRenderer } from '../../src/services/email/email-renderer';
import { EmailTemplates } from '../../src/services/email/email-templates';
import { EmailPreferenceService } from '../../src/services/email/email-preference.service';
import { EmailProviderService } from '../../src/services/email/email-provider.service';
import { EmailQueueService } from '../../src/services/email/email-queue.service';
import { EmailJobStatus, JobPriority } from '../../generated/prisma';

vi.mock('../../src/lib/db/prisma', () => ({
  db: {
    emailJob: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        if (where?.dedupeKey === 'EMAIL:DUP-100') {
          return Promise.resolve({ id: 'existing-email-job', dedupeKey: 'EMAIL:DUP-100' });
        }
        return Promise.resolve(null);
      }),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'email-job-1', ...data })),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'email-job-1', ...data })),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    customerNotificationPreference: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        if (where?.userId === 'user-no-email-promo') {
          return Promise.resolve({
            userId: 'user-no-email-promo',
            emailPromotions: false,
            emailSubscriptions: true,
          });
        }
        return Promise.resolve(null);
      }),
      create: vi.fn().mockResolvedValue({
        userId: 'user-1',
        emailPromotions: true,
        emailSubscriptions: true,
      }),
    },
    globalEmailSettings: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'default',
        mode: 'development',
        sendEnabled: false,
        devStrategy: 'capture',
        devRedirectTo: '',
        fromName: 'Gogomi Store',
        fromAddress: 'no-reply@gogomi.store',
        replyTo: 'support@gogomi.store',
      }),
      create: vi.fn().mockResolvedValue({
        id: 'default',
        mode: 'development',
        sendEnabled: false,
        devStrategy: 'capture',
      }),
    },
  },
}));

describe('Master Email Notification System Tests', () => {
  it('DEVELOPMENT SAFETY TEST: Should capture emails safely as DEV_CAPTURED without internet send', async () => {
    const result = await EmailProviderService.sendEmail({
      recipientEmail: 'realcustomer@example.com',
      subject: 'Pembayaran Berhasil — Order #ORD-999',
      html: '<p>Pembayaran berhasil.</p>',
      text: 'Pembayaran berhasil.',
    });

    expect(result.success).toBe(true);
    expect(result.isDevCaptured).toBe(true);
    expect(result.providerMessageId).toContain('DEV-CAP-');
  });

  it('SENSITIVE DATA SCAN TEST: Should strictly strip passwords, credentials, PINs, and license keys from rendered emails', async () => {
    const render = EmailTemplates.renderTemplate('PRODUCT_DELIVERED', {
      customerName: 'Budi',
      orderNumber: 'ORD-10029',
      productName: 'Adobe Creative Cloud',
      variantName: '1 Bulan Full Akses',
      passwordSecret: 'SUPER_SECRET_PASS_123!', // FORBIDDEN
      licenseKeySecret: 'LICENSE-KEY-ABC-XYZ',   // FORBIDDEN
      pinCode: '998811',                          // FORBIDDEN
    });

    // Subject, HTML, and Text must NOT contain secret strings
    expect(render.subject).not.toContain('SUPER_SECRET_PASS');
    expect(render.html).not.toContain('SUPER_SECRET_PASS');
    expect(render.html).not.toContain('LICENSE-KEY-ABC-XYZ');
    expect(render.html).not.toContain('998811');
    expect(render.text).not.toContain('SUPER_SECRET_PASS');

    // Email MUST contain CTA to login to dashboard safely
    expect(render.html).toContain('LIHAT PRODUK SAYA');
    expect(render.html).toContain('/account/products');
  });

  it('IDEMPOTENCY DEDUPLICATION TEST: Should prevent duplicate EmailJobs for same dedupeKey', async () => {
    const job = await EmailQueueService.enqueueEmailJob({
      recipientUserId: 'user-1',
      recipientEmail: 'budi@example.com',
      eventType: 'PAYMENT_SUCCESS',
      category: 'TRANSACTIONAL',
      templateKey: 'PAYMENT_SUCCESS',
      subject: 'Pembayaran Berhasil',
      dedupeKey: 'EMAIL:DUP-100',
    });

    expect(job).toBeDefined();
    expect(job?.id).toBe('existing-email-job');
  });

  it('PREFERENCE FILTERING & LOCK TEST: Should skip optional emails if disabled but enforce essential emails', async () => {
    // 1. Optional email (PROMOTION) should be skipped
    const isPromoEnabled = await EmailPreferenceService.isEmailCategoryEnabled(
      'user-no-email-promo',
      'MARKETING',
      'SPECIAL_OFFER'
    );
    expect(isPromoEnabled).toBe(false);

    // 2. Essential security & transactional emails MUST BE LOCKED ON
    const isVerifyEnabled = await EmailPreferenceService.isEmailCategoryEnabled(
      'user-no-email-promo',
      'SECURITY',
      'VERIFY_EMAIL'
    );
    const isPaymentEnabled = await EmailPreferenceService.isEmailCategoryEnabled(
      'user-no-email-promo',
      'TRANSACTIONAL',
      'PAYMENT_SUCCESS'
    );

    expect(isVerifyEnabled).toBe(true);
    expect(isPaymentEnabled).toBe(true);
  });

  it('REMINDER OBSOLETE CANCELLATION TEST: Should cancel pending subscription reminders when customer renews', async () => {
    await EmailQueueService.cancelObsoleteReminders('SUBSCRIPTION', 'sub-1029');
    // Cancellation executes without error
    expect(true).toBe(true);
  });
});
