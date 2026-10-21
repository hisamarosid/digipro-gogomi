import { db } from '@/lib/db/prisma';
import { CustomerNotificationCategory } from '../../../generated/prisma';

export class NotificationPreferenceService {
  /**
   * Retrieves or initializes customer notification preferences
   */
  static async getCustomerPreferences(userId: string) {
    let pref = await db.customerNotificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await db.customerNotificationPreference.create({
        data: {
          userId,
          inAppOrderUpdates: true,
          inAppProductUpdates: true,
          inAppReplacements: true,
          inAppSubscriptions: true,
          inAppRenewals: true,
          inAppWaitlist: true,
          inAppPriceAlerts: true,
          inAppReferrals: true,
          inAppSupport: true,
          inAppSecurity: true,
          inAppCoins: true,
          inAppPromotions: true,
        },
      });
    }

    return pref;
  }

  /**
   * Updates customer notification preferences.
   * Essential categories (Security, Order, Replacement, Payment) remain locked ON.
   */
  static async updateCustomerPreferences(
    userId: string,
    updates: {
      inAppSubscriptions?: boolean;
      inAppRenewals?: boolean;
      inAppWaitlist?: boolean;
      inAppPriceAlerts?: boolean;
      inAppReferrals?: boolean;
      inAppCoins?: boolean;
      inAppPromotions?: boolean;
    }
  ) {
    await this.getCustomerPreferences(userId); // Ensure record exists

    return await db.customerNotificationPreference.update({
      where: { userId },
      data: {
        ...updates,
        // Essential categories are strictly locked ON
        inAppOrderUpdates: true,
        inAppProductUpdates: true,
        inAppReplacements: true,
        inAppSupport: true,
        inAppSecurity: true,
      },
    });
  }

  /**
   * Checks if customer has enabled a specific notification category
   */
  static async isCategoryEnabled(userId: string, category: CustomerNotificationCategory): Promise<boolean> {
    const pref = await this.getCustomerPreferences(userId);

    switch (category) {
      case CustomerNotificationCategory.PROMOTION:
        return pref.inAppPromotions;
      case CustomerNotificationCategory.COIN:
        return pref.inAppCoins;
      default:
        // Essential categories (ORDER, PAYMENT, PRODUCT, REPLACEMENT, SUBSCRIPTION, SUPPORT, SECURITY) default to true
        return true;
    }
  }
}
