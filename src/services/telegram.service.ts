import { db } from '@/lib/db/prisma';
import { formatDateJakarta, formatIDR } from '@/lib/utils/formatters';
import { SiteSettingService } from './siteSetting.service';

export interface TelegramMessageOptions {
  eventType: string;
  entityType?: string;
  entityId?: string;
  dedupeKey?: string;
  text: string;
  parseMode?: 'HTML' | 'MarkdownV2';
  actionUrl?: string;
  actionText?: string;
}

export class TelegramService {
  private static DEFAULT_APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://gogomi.store';

  /**
   * Helper to escape HTML characters for Telegram HTML parse mode
   */
  static escapeHtml(text: string | null | undefined): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Masks email for privacy (e.g. f***@gmail.com)
   */
  static maskEmail(email: string | null | undefined): string {
    if (!email) return '-';
    const parts = email.split('@');
    if (parts.length !== 2) return email.slice(0, 2) + '***';
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) {
      return `${name.charAt(0)}***@${domain}`;
    }
    return `${name.charAt(0)}***${name.charAt(name.length - 1)}@${domain}`;
  }

  /**
   * Masks phone for privacy (e.g. 08******1234)
   */
  static maskPhone(phone: string | null | undefined): string {
    if (!phone) return '-';
    const clean = phone.replace(/[^0-9+]/g, '');
    if (clean.length <= 6) return clean.slice(0, 2) + '****';
    return clean.slice(0, 3) + '******' + clean.slice(-4);
  }

  /**
   * Retrieves active Telegram Bot Token, Admin Chat ID, and Base API URL
   */
  static async getConfig() {
    let botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    let chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
    let apiBaseUrl = process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org';
    let isEnabled = true;

    try {
      const settings = await SiteSettingService.getAllSettings();
      if (settings.TELEGRAM_ENABLED === 'false') {
        isEnabled = false;
      }
      if (settings.TELEGRAM_BOT_TOKEN && settings.TELEGRAM_BOT_TOKEN.trim()) {
        botToken = settings.TELEGRAM_BOT_TOKEN.trim();
      }
      if (settings.TELEGRAM_ADMIN_CHAT_ID && settings.TELEGRAM_ADMIN_CHAT_ID.trim()) {
        chatId = settings.TELEGRAM_ADMIN_CHAT_ID.trim();
      }
      if (settings.TELEGRAM_API_BASE_URL && settings.TELEGRAM_API_BASE_URL.trim()) {
        apiBaseUrl = settings.TELEGRAM_API_BASE_URL.trim();
      }
    } catch {
      // Fallback to env variables if database not accessible
    }

    return {
      isEnabled,
      botToken: botToken.trim(),
      chatId: chatId.trim(),
      apiBaseUrl: apiBaseUrl.trim(),
    };
  }

  private static memoryDedupeCache = new Map<string, { status: string; timestamp: number }>();

  /**
   * Core Telegram API Dispatcher with Deduplication, Retry & Audit Logging
   * Guaranteed side-effect: never throws exceptions that break calling workflows
   */
  static async sendMessage(options: TelegramMessageOptions): Promise<{ success: boolean; error?: string }> {
    const { eventType, entityType, entityId, dedupeKey, text, parseMode = 'HTML', actionUrl, actionText } = options;

    try {
      const config = await this.getConfig();

      if (!config.isEnabled) {
        return { success: false, error: 'TELEGRAM_DISABLED' };
      }

      if (!config.botToken || !config.chatId) {
        console.warn('[TelegramService] Bot Token or Admin Chat ID is not configured.');
        return { success: false, error: 'TELEGRAM_NOT_CONFIGURED' };
      }

      // Check per-event toggle if applicable
      const isEventAllowed = await this.isEventTypeEnabled(eventType);
      if (!isEventAllowed) {
        return { success: false, error: 'EVENT_NOTIFICATION_DISABLED' };
      }

      // Idempotency check: prevent duplicate Telegram alert for the same dedupeKey
      if (dedupeKey) {
        // 1. Check in-memory cache
        const cached = this.memoryDedupeCache.get(dedupeKey);
        if (cached && cached.status === 'SUCCESS') {
          return { success: true };
        }

        // 2. Check database log if available
        try {
          const existingLog = await (db as any).telegramNotificationLog?.findUnique({
            where: { dedupeKey },
          });

          if (existingLog && existingLog.status === 'SUCCESS') {
            this.memoryDedupeCache.set(dedupeKey, { status: 'SUCCESS', timestamp: Date.now() });
            return { success: true };
          }
        } catch {
          // Table might not exist yet; gracefully ignore DB check
        }
      }

      // Construct formatted message payload
      let fullText = text;
      if (actionUrl) {
        const fullUrl = actionUrl.startsWith('http') ? actionUrl : `${this.DEFAULT_APP_URL}${actionUrl}`;
        const label = actionText || 'BUKA DI ADMIN';
        fullText += `\n\n🔗 <a href="${fullUrl}">[ ${this.escapeHtml(label)} ]</a>`;
      }

      const telegramApiUrl = `${config.apiBaseUrl.replace(/\/+$/, '')}/bot${config.botToken}/sendMessage`;
      const payload = {
        chat_id: config.chatId,
        text: fullText,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      };

      // Retry loop (Max 2 attempts with exponential backoff and timeout)
      let attempt = 0;
      let lastError: string | null = null;
      let isDelivered = false;

      while (attempt < 2 && !isDelivered) {
        attempt++;
        try {
          const res = await fetch(telegramApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(6000),
          });

          const json = await res.json();
          if (res.ok && json.ok) {
            isDelivered = true;
          } else {
            lastError = json.description || `HTTP ${res.status}`;
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, attempt * 500));
            }
          }
        } catch (fetchErr: any) {
          lastError = fetchErr?.message || 'Network connection failed';
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, attempt * 500));
          }
        }
      }

      // Update in-memory cache
      if (dedupeKey) {
        this.memoryDedupeCache.set(dedupeKey, {
          status: isDelivered ? 'SUCCESS' : 'FAILED',
          timestamp: Date.now(),
        });
      }

      // Record Delivery Log safely in database (never storing bot token or raw secrets)
      try {
        if ((db as any).telegramNotificationLog) {
          await (db as any).telegramNotificationLog.upsert({
            where: { dedupeKey: dedupeKey || `tg-log-${Date.now()}-${Math.random()}` },
            create: {
              eventType,
              entityType: entityType || null,
              entityId: entityId || null,
              dedupeKey: dedupeKey || null,
              chatId: config.chatId,
              status: isDelivered ? 'SUCCESS' : 'FAILED',
              attempts: attempt,
              sentAt: isDelivered ? new Date() : null,
              errorCode: isDelivered ? null : lastError?.slice(0, 100) || 'DELIVERY_FAILED',
              errorMessage: isDelivered ? null : lastError?.slice(0, 255) || null,
            },
            update: {
              status: isDelivered ? 'SUCCESS' : 'FAILED',
              attempts: attempt,
              sentAt: isDelivered ? new Date() : undefined,
              errorCode: isDelivered ? null : lastError?.slice(0, 100) || 'DELIVERY_FAILED',
              errorMessage: isDelivered ? null : lastError?.slice(0, 255) || null,
            },
          });
        }
      } catch (logErr: any) {
        // Graceful logging without throwing or attempting invalid foreign keys
      }

      if (!isDelivered) {
        console.error(`[TelegramService Delivery Error] ${eventType}: ${lastError}`);
        return { success: false, error: lastError || 'DELIVERY_FAILED' };
      }

      return { success: true };
    } catch (err: any) {
      console.error('[TelegramService Unexpected Error]:', err?.message || err);
      return { success: false, error: err?.message || 'INTERNAL_ERROR' };
    }
  }

  /**
   * Checks whether a specific notification event type is enabled in SiteSettings
   */
  private static async isEventTypeEnabled(eventType: string): Promise<boolean> {
    try {
      const s = await SiteSettingService.getAllSettings();
      switch (eventType) {
        case 'ORDER_PAID':
          return s.TELEGRAM_NOTIF_ORDER_PAID !== 'false';
        case 'FULFILLMENT_WAITING_STOCK':
          return s.TELEGRAM_NOTIF_WAITING_STOCK !== 'false';
        case 'FULFILLMENT_FAILED':
          return s.TELEGRAM_NOTIF_FULFILLMENT_FAILED !== 'false';
        case 'REPLACEMENT_REQUESTED':
        case 'REPLACEMENT_FAILED':
          return s.TELEGRAM_NOTIF_REPLACEMENT !== 'false';
        case 'INVENTORY_LOW_STOCK':
        case 'INVENTORY_OUT_OF_STOCK':
        case 'SHARED_MASTER_INVALID':
          return s.TELEGRAM_NOTIF_LOW_STOCK !== 'false';
        case 'SUPPLIER_CLAIM_RECOMMENDED':
        case 'SUPPLIER_CLAIM_DEADLINE':
          return s.TELEGRAM_NOTIF_SUPPLIER_CLAIM !== 'false';
        case 'PAYMENT_MISMATCH':
        case 'WEBHOOK_ERROR':
        case 'EMAIL_QUEUE_FAILED':
        case 'CRON_FAILED':
        case 'WORKER_FAILED':
          return s.TELEGRAM_NOTIF_SYSTEM_ERROR !== 'false';
        case 'SECURITY_ALERT':
          return s.TELEGRAM_NOTIF_SECURITY !== 'false';
        default:
          return true;
      }
    } catch {
      return true;
    }
  }

  // ==========================================
  // SPECIFIC BUSINESS EVENT HANDLERS
  // ==========================================

  /**
   * 1. ORDER_PAID: Triggered only when order is verified as PAID / SETTLED
   */
  static async sendOrderPaidNotification(order: {
    id: string;
    orderNumber: string;
    grandTotal: number;
    cashPayableAmount?: number;
    user?: { email?: string | null; name?: string | null } | null;
    guestEmail?: string | null;
    guestName?: string | null;
    items?: Array<{ productName: string; variantName?: string | null; quantity: number }>;
    createdAt?: Date | string;
  }) {
    const customerEmail = this.maskEmail(order.user?.email || order.guestEmail || '-');
    const customerName = order.user?.name || order.guestName || 'Customer';
    const amount = order.cashPayableAmount && order.cashPayableAmount > 0 ? order.cashPayableAmount : order.grandTotal;
    const timeStr = formatDateJakarta(new Date());

    // Format products list (max 3 items + overflow count)
    const items = order.items || [];
    let itemsSummary = '';
    const displayedItems = items.slice(0, 3);
    displayedItems.forEach((it) => {
      const vStr = it.variantName ? ` (${it.variantName})` : '';
      itemsSummary += `• <b>${this.escapeHtml(it.productName)}</b>${this.escapeHtml(vStr)} × ${it.quantity}\n`;
    });
    if (items.length > 3) {
      itemsSummary += `• <i>+ ${items.length - 3} produk lainnya</i>\n`;
    }
    if (!itemsSummary) {
      itemsSummary = '• Produk Digital\n';
    }

    const message = `<b>[GOGOMI STORE]</b>\n\n🛒 <b>ORDER BARU DIBAYAR</b>\n\n<b>No. Order:</b> <code>#${order.orderNumber}</code>\n<b>Customer:</b> ${this.escapeHtml(customerName)} (${customerEmail})\n<b>Total Bayar:</b> ${formatIDR(amount)}\n<b>Status:</b> ✅ PAID / SETTLEMENT\n<b>Waktu:</b> ${timeStr}\n\n<b>Item Pesanan:</b>\n${itemsSummary}`;

    return await this.sendMessage({
      eventType: 'ORDER_PAID',
      entityType: 'Order',
      entityId: order.id,
      dedupeKey: `ORDER_PAID:${order.id}`,
      text: message,
      actionUrl: `/admin/orders?search=${order.orderNumber}`,
      actionText: 'BUKA DETAIL ORDER',
    });
  }

  /**
   * 2. FULFILLMENT_WAITING_STOCK: Paid order is waiting for restock
   */
  static async sendFulfillmentWaitingStockNotification(payload: {
    orderId: string;
    orderNumber: string;
    productName: string;
    variantName?: string;
    issue?: string;
  }) {
    const timeStr = formatDateJakarta(new Date());
    const message = `<b>[GOGOMI STORE]</b>\n\n⚠️ <b>WAITING STOCK (STOK KOSONG)</b>\n\n<b>No. Order:</b> <code>#${payload.orderNumber}</code>\n<b>Produk:</b> ${this.escapeHtml(payload.productName)}\n<b>Varian:</b> ${this.escapeHtml(payload.variantName || '-')}\n<b>Kendala:</b> ${this.escapeHtml(payload.issue || 'Stok eligible tidak tersedia.')}\n<b>Status Order:</b> PAID (Menunggu Pengisian Stok)\n<b>Waktu:</b> ${timeStr}`;

    return await this.sendMessage({
      eventType: 'FULFILLMENT_WAITING_STOCK',
      entityType: 'Order',
      entityId: payload.orderId,
      dedupeKey: `FULFILLMENT_WAITING_STOCK:${payload.orderId}`,
      text: message,
      actionUrl: `/admin/operations/fulfillment`,
      actionText: 'BUKA FULFILLMENT QUEUE',
    });
  }

  /**
   * 3. FULFILLMENT_FAILED: Fulfillment job failed after maximum retries
   */
  static async sendFulfillmentFailedNotification(payload: {
    orderId: string;
    orderNumber: string;
    productName: string;
    reason: string;
  }) {
    const timeStr = formatDateJakarta(new Date());
    const message = `<b>[GOGOMI STORE]</b>\n\n❌ <b>FULFILLMENT GAGAL</b>\n\n<b>No. Order:</b> <code>#${payload.orderNumber}</code>\n<b>Produk:</b> ${this.escapeHtml(payload.productName)}\n<b>Alasan:</b> ${this.escapeHtml(payload.reason)}\n<b>Waktu:</b> ${timeStr}\n\n<i>Harap cek antrean fulfillment dan lakukan tindakan manual.</i>`;

    return await this.sendMessage({
      eventType: 'FULFILLMENT_FAILED',
      entityType: 'Order',
      entityId: payload.orderId,
      dedupeKey: `FULFILLMENT_FAILED:${payload.orderId}`,
      text: message,
      actionUrl: `/admin/operations/fulfillment`,
      actionText: 'PERIKSA MASALAH FULFILLMENT',
    });
  }

  /**
   * 4. REPLACEMENT_REQUESTED: Customer requested warranty replacement
   */
  static async sendReplacementRequestedNotification(payload: {
    requestId: string;
    requestNumber: string;
    orderNumber?: string;
    productName: string;
    customerEmail?: string;
    reason?: string;
    isAutoApproved?: boolean;
  }) {
    const timeStr = formatDateJakarta(new Date());
    const emailStr = this.maskEmail(payload.customerEmail);
    const modeStr = payload.isAutoApproved ? '✅ Otomatis Disetujui' : '⏳ Menunggu Persetujuan Admin';

    const message = `<b>[GOGOMI STORE]</b>\n\n🔄 <b>KLAIM REPLACEMENT DIAJUKAN</b>\n\n<b>No. Request:</b> <code>#${payload.requestNumber}</code>\n<b>No. Order:</b> <code>#${payload.orderNumber || '-'}</code>\n<b>Customer:</b> ${emailStr}\n<b>Produk:</b> ${this.escapeHtml(payload.productName)}\n<b>Kendala:</b> ${this.escapeHtml(payload.reason || 'Kredensial / Akun Bermasalah')}\n<b>Mode:</b> ${modeStr}\n<b>Waktu:</b> ${timeStr}`;

    return await this.sendMessage({
      eventType: 'REPLACEMENT_REQUESTED',
      entityType: 'ReplacementRequest',
      entityId: payload.requestId,
      dedupeKey: `REPLACEMENT_REQUESTED:${payload.requestId}`,
      text: message,
      actionUrl: `/admin/replacements`,
      actionText: 'TINJAU REPLACEMENT',
    });
  }

  /**
   * 5. REPLACEMENT_FAILED: Replacement failed due to missing stock or system error
   */
  static async sendReplacementFailedNotification(payload: {
    requestId: string;
    requestNumber: string;
    productName: string;
    reason: string;
  }) {
    const timeStr = formatDateJakarta(new Date());
    const message = `<b>[GOGOMI STORE]</b>\n\n❌ <b>REPLACEMENT GAGAL DIPROSES</b>\n\n<b>No. Request:</b> <code>#${payload.requestNumber}</code>\n<b>Produk:</b> ${this.escapeHtml(payload.productName)}\n<b>Alasan:</b> ${this.escapeHtml(payload.reason)}\n<b>Waktu:</b> ${timeStr}`;

    return await this.sendMessage({
      eventType: 'REPLACEMENT_FAILED',
      entityType: 'ReplacementRequest',
      entityId: payload.requestId,
      dedupeKey: `REPLACEMENT_FAILED:${payload.requestId}`,
      text: message,
      actionUrl: `/admin/replacements`,
      actionText: 'BUKA DAFTAR REPLACEMENT',
    });
  }

  /**
   * 6. SHARED_MASTER_INVALID: Master shared account died or credentials changed
   */
  static async sendSharedMasterInvalidNotification(payload: {
    accountId: string;
    label: string;
    productName: string;
    variantName?: string;
    affectedSlots?: number;
    reason?: string;
  }) {
    const timeStr = formatDateJakarta(new Date());
    const message = `<b>[GOGOMI STORE]</b>\n\n🚨 <b>MASTER SHARED ACCOUNT RUSAK / INVALID</b>\n\n<b>Label Master:</b> <code>${this.escapeHtml(payload.label)}</code>\n<b>Produk:</b> ${this.escapeHtml(payload.productName)} (${this.escapeHtml(payload.variantName || '-')})\n<b>Slot Terdampak:</b> ${payload.affectedSlots || 0} customer\n<b>Alasan:</b> ${this.escapeHtml(payload.reason || 'Kredensial master tidak valid')}\n<b>Waktu:</b> ${timeStr}\n\n<i>Segera lakukan pergantian master atau mass replacement akun!</i>`;

    return await this.sendMessage({
      eventType: 'SHARED_MASTER_INVALID',
      entityType: 'SharedAccount',
      entityId: payload.accountId,
      dedupeKey: `SHARED_MASTER_INVALID:${payload.accountId}`,
      text: message,
      actionUrl: `/admin/inventory/shared`,
      actionText: 'KELOLA AKUN SHARED',
    });
  }

  /**
   * 7. INVENTORY_LOW_STOCK / INVENTORY_OUT_OF_STOCK
   */
  static async sendInventoryAlertNotification(payload: {
    variantId: string;
    productName: string;
    variantName: string;
    remainingStock: number;
    minThreshold: number;
  }) {
    const isOut = payload.remainingStock <= 0;
    const timeStr = formatDateJakarta(new Date());

    const header = isOut ? '🚨 <b>STOK HABIS (OUT OF STOCK)</b>' : '⚠️ <b>STOK MENIPIS (LOW STOCK)</b>';
    const message = `<b>[GOGOMI STORE]</b>\n\n${header}\n\n<b>Produk:</b> ${this.escapeHtml(payload.productName)}\n<b>Varian:</b> ${this.escapeHtml(payload.variantName)}\n<b>Sisa Stok:</b> <b>${payload.remainingStock} unit</b> (Batas Kritis: ${payload.minThreshold})\n<b>Waktu:</b> ${timeStr}\n\n<i>Harap segera lakukan restock inventori untuk varian ini.</i>`;

    const eventType = isOut ? 'INVENTORY_OUT_OF_STOCK' : 'INVENTORY_LOW_STOCK';
    return await this.sendMessage({
      eventType,
      entityType: 'ProductVariant',
      entityId: payload.variantId,
      dedupeKey: `${eventType}:${payload.variantId}:${new Date().toISOString().slice(0, 13)}`, // dedupe hourly
      text: message,
      actionUrl: `/admin/inventory`,
      actionText: 'RESTOCK INVENTORI SEKARANG',
    });
  }

  /**
   * 8. SUPPLIER_CLAIM_RECOMMENDED & SUPPLIER_CLAIM_DEADLINE
   */
  static async sendSupplierClaimNotification(payload: {
    claimId: string;
    claimNumber?: string;
    supplierName: string;
    productName: string;
    type: 'RECOMMENDED' | 'DEADLINE';
    daysLeft?: number;
  }) {
    const timeStr = formatDateJakarta(new Date());
    const isDeadline = payload.type === 'DEADLINE';

    const header = isDeadline ? '⏰ <b>DEADLINE GARANSI SUPPLIER MENDEKATI</b>' : '🛡️ <b>REKOMENDASI KLAIM SUPPLIER</b>';
    const deadlineStr = isDeadline ? `\n<b>Sisa Waktu Garansi:</b> ${payload.daysLeft || 0} hari` : '';

    const message = `<b>[GOGOMI STORE]</b>\n\n${header}\n\n<b>Supplier:</b> ${this.escapeHtml(payload.supplierName)}\n<b>Produk:</b> ${this.escapeHtml(payload.productName)}${deadlineStr}\n<b>Waktu:</b> ${timeStr}\n\n<i>Ajukan klaim sebelum masa garansi supplier hangus.</i>`;

    const eventType = isDeadline ? 'SUPPLIER_CLAIM_DEADLINE' : 'SUPPLIER_CLAIM_RECOMMENDED';
    return await this.sendMessage({
      eventType,
      entityType: 'SupplierClaim',
      entityId: payload.claimId,
      dedupeKey: `${eventType}:${payload.claimId}`,
      text: message,
      actionUrl: `/admin/suppliers/claims`,
      actionText: 'BUKA KLAIM SUPPLIER',
    });
  }

  /**
   * 9. PAYMENT_MISMATCH: Webhook amount or currency mismatch
   */
  static async sendPaymentMismatchNotification(payload: {
    orderNumber: string;
    expectedAmount: number;
    gotAmount: number;
    transactionId?: string;
  }) {
    const timeStr = formatDateJakarta(new Date());
    const message = `<b>[GOGOMI STORE]</b>\n\n⚠️ <b>PAYMENT AMOUNT MISMATCH</b>\n\n<b>No. Order:</b> <code>#${payload.orderNumber}</code>\n<b>Expected Amount:</b> ${formatIDR(payload.expectedAmount)}\n<b>Received Amount:</b> ${formatIDR(payload.gotAmount)}\n<b>Gateway Ref:</b> <code>${payload.transactionId || '-'}</code>\n<b>Waktu:</b> ${timeStr}\n\n<i>Pembayaran ditahan karena jumlah yang dibayar tidak sesuai.</i>`;

    return await this.sendMessage({
      eventType: 'PAYMENT_MISMATCH',
      entityType: 'Payment',
      entityId: payload.orderNumber,
      dedupeKey: `PAYMENT_MISMATCH:${payload.orderNumber}`,
      text: message,
      actionUrl: `/admin/payments`,
      actionText: 'PERIKSA LOG PEMBAYARAN',
    });
  }

  /**
   * 10. WEBHOOK_ERROR: Gateway webhook signature failure or invalid payload
   */
  static async sendWebhookErrorNotification(provider: string, errorReason: string) {
    const timeStr = formatDateJakarta(new Date());
    const message = `<b>[GOGOMI STORE]</b>\n\n❌ <b>WEBHOOK GATEWAY ERROR</b>\n\n<b>Provider:</b> ${this.escapeHtml(provider)}\n<b>Error:</b> ${this.escapeHtml(errorReason)}\n<b>Waktu:</b> ${timeStr}`;

    return await this.sendMessage({
      eventType: 'WEBHOOK_ERROR',
      dedupeKey: `WEBHOOK_ERROR:${provider}:${new Date().toISOString().slice(0, 14)}`, // dedupe 10 mins
      text: message,
      actionUrl: `/admin/payments`,
      actionText: 'BUKA LOG GATEWAY',
    });
  }

  /**
   * 11. EMAIL_QUEUE_FAILED: Email failed after maximum retries
   */
  static async sendEmailQueueFailedNotification(payload: {
    jobId: string;
    recipientEmail: string;
    templateKey: string;
    errorReason: string;
  }) {
    const timeStr = formatDateJakarta(new Date());
    const maskedEmail = this.maskEmail(payload.recipientEmail);

    const message = `<b>[GOGOMI STORE]</b>\n\n❌ <b>EMAIL QUEUE GAGAL TERKIRIM</b>\n\n<b>Penerima:</b> ${maskedEmail}\n<b>Template:</b> <code>${this.escapeHtml(payload.templateKey)}</code>\n<b>Error:</b> ${this.escapeHtml(payload.errorReason)}\n<b>Waktu:</b> ${timeStr}`;

    return await this.sendMessage({
      eventType: 'EMAIL_QUEUE_FAILED',
      entityType: 'EmailJob',
      entityId: payload.jobId,
      dedupeKey: `EMAIL_QUEUE_FAILED:${payload.jobId}`,
      text: message,
      actionUrl: `/admin/settings`,
      actionText: 'PERIKSA PENGATURAN SMTP',
    });
  }

  /**
   * 12. CRON_FAILED / WORKER_FAILED
   */
  static async sendSystemJobFailedNotification(jobName: string, errorReason: string) {
    const timeStr = formatDateJakarta(new Date());
    const message = `<b>[GOGOMI STORE]</b>\n\n❌ <b>BACKGROUND JOB / CRON GAGAL</b>\n\n<b>Job:</b> <code>${this.escapeHtml(jobName)}</code>\n<b>Error:</b> ${this.escapeHtml(errorReason)}\n<b>Waktu:</b> ${timeStr}`;

    return await this.sendMessage({
      eventType: 'CRON_FAILED',
      dedupeKey: `CRON_FAILED:${jobName}:${new Date().toISOString().slice(0, 13)}`,
      text: message,
      actionUrl: `/admin/operations/fulfillment`,
      actionText: 'PERIKSA STATUS SISTEM',
    });
  }

  /**
   * 13. SECURITY_ALERT: Suspicious administrative action or brute force
   */
  static async sendSecurityAlertNotification(payload: {
    action: string;
    actorEmail?: string;
    ip?: string;
    details?: string;
  }) {
    const timeStr = formatDateJakarta(new Date());
    const message = `<b>[GOGOMI STORE]</b>\n\n🚨 <b>SECURITY ALERT</b>\n\n<b>Aksi:</b> <code>${this.escapeHtml(payload.action)}</code>\n<b>Aktor:</b> ${this.escapeHtml(payload.actorEmail || 'Unknown')}\n<b>IP Address:</b> <code>${payload.ip || 'Unknown'}</code>\n<b>Detail:</b> ${this.escapeHtml(payload.details || '-')}\n<b>Waktu:</b> ${timeStr}`;

    return await this.sendMessage({
      eventType: 'SECURITY_ALERT',
      dedupeKey: `SECURITY_ALERT:${payload.action}:${Date.now()}`,
      text: message,
      actionUrl: `/admin/audit-logs`,
      actionText: 'BUKA AUDIT LOGS',
    });
  }

  /**
   * 14. TEST TELEGRAM: Manual test message dispatched by Super Admin
   */
  static async sendTestNotification(actorEmail: string = 'Super Admin') {
    const timeStr = formatDateJakarta(new Date());
    const env = process.env.NODE_ENV || 'development';

    const message = `<b>[GOGOMI STORE]</b>\n\n✅ <b>TEST KONEKSI TELEGRAM BERHASIL</b>\n\nBot notifikasi admin telah berhasil terhubung dengan sistem Gogomi Store.\n\n<b>Environment:</b> <code>${env}</code>\n<b>Pemicu:</b> ${this.escapeHtml(actorEmail)}\n<b>Waktu:</b> ${timeStr}\n\n<i>Seluruh alert operasional & order lunas akan otomatis diteruskan ke channel/chat ini.</i>`;

    return await this.sendMessage({
      eventType: 'TEST_NOTIFICATION',
      text: message,
      actionUrl: `/admin/settings`,
      actionText: 'PENGATURAN ADMIN',
    });
  }
}
