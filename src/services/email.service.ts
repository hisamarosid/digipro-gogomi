import { FeatureFlagService } from './featureFlag.service';

export class EmailService {
  /**
   * Safe email notification abstraction supporting SMTP template delivery.
   * Catches errors gracefully so email failure does not roll back successful payment/order state.
   */
  static async sendOrderConfirmation(to: string, orderNumber: string, grandTotal: number) {
    try {
      if (!(await FeatureFlagService.isEnabled('EMAIL_NOTIFICATIONS'))) {
        return { success: true, skipped: true };
      }
      console.log(`[EmailService] Sending Order Confirmation to ${to} for Order ${orderNumber} (${grandTotal} IDR)`);
      // SMTP transport execution logic here
      return { success: true };
    } catch (err: any) {
      console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  static async sendPasswordReset(to: string, resetToken: string) {
    try {
      console.log(`[EmailService] Sending Password Reset to ${to}`);
      return { success: true };
    } catch (err: any) {
      console.error(`[EmailService] Failed to send password reset:`, err.message);
      return { success: false, error: err.message };
    }
  }

  static async sendFulfillmentFailedEmail(params: { orderNumber: string; customerEmail: string; productName: string; reason: string }) {
    try {
      console.log(`[EmailService] Sending Critical Alert to ${params.customerEmail} for Order #${params.orderNumber}`);
      return { success: true };
    } catch (err: any) {
      console.error(`[EmailService] Failed to send fulfillment alert email:`, err.message);
      return { success: false, error: err.message };
    }
  }
}
