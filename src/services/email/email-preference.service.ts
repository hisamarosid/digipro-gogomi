import { db } from '@/lib/db/prisma';

export class EmailPreferenceService {
  /**
   * Checks if an email should be sent to the recipient based on email category & user preferences.
   * Essential transactional & security emails always return true (LOCKED ON).
   */
  static async isEmailCategoryEnabled(
    userId: string | null | undefined,
    category: string,
    templateKey: string
  ): Promise<boolean> {
    // 1. Security & Critical Transactional Emails are REQUIRED and cannot be disabled
    if (
      category === 'SECURITY' ||
      templateKey === 'VERIFY_EMAIL' ||
      templateKey === 'PASSWORD_RESET' ||
      templateKey === 'PASSWORD_CHANGED' ||
      templateKey === 'PAYMENT_SUCCESS' ||
      templateKey === 'PRODUCT_DELIVERED' ||
      templateKey === 'REPLACEMENT_COMPLETED' ||
      templateKey === 'SUPPORT_REPLY'
    ) {
      return true;
    }

    if (!userId) {
      // Unauthenticated visitors receive transactional emails by default
      return category === 'TRANSACTIONAL';
    }

    // 2. Fetch customer email preferences
    let pref = await db.customerNotificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await db.customerNotificationPreference.create({
        data: { userId },
      });
    }

    // 3. Evaluate category permissions
    switch (category) {
      case 'MARKETING':
        return pref.emailPromotions;
      case 'LOYALTY':
        return pref.emailCoins;
      case 'REMINDER':
        if (templateKey.includes('SUBSCRIPTION')) return pref.emailSubscriptions;
        if (templateKey.includes('WAITLIST')) return pref.emailWaitlist;
        if (templateKey.includes('PRICE_DROP')) return pref.emailPriceAlerts;
        return true;
      default:
        return true;
    }
  }
}
