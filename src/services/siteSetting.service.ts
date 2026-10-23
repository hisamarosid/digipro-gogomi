import { db } from '@/lib/db/prisma';

export interface SiteSettingsData {
  // Brand & Identity
  STORE_NAME: string;
  STORE_TAGLINE: string;
  STORE_LOGO_URL: string;
  STORE_ICON_URL: string;
  STORE_FAVICON_URL: string;
  STORE_THEME_COLOR: string;

  // SEO & Meta Tags
  SEO_TITLE: string;
  SEO_DESCRIPTION: string;
  SEO_KEYWORDS: string;
  SEO_OG_IMAGE: string;
  SEO_TWITTER_CARD: string;
  SEO_CANONICAL_URL: string;
  GOOGLE_ANALYTICS_ID: string;
  FACEBOOK_PIXEL_ID: string;
  GSC_VERIFICATION_CODE: string;

  // Contact & Support
  SUPPORT_EMAIL: string;
  SUPPORT_WHATSAPP: string;
  SUPPORT_TELEGRAM: string;
  SUPPORT_HOURS: string;
  STORE_ADDRESS: string;

  // Payment & Currency
  AUTOGOPAY_MERCHANT_ID: string;
  AUTOGOPAY_API_KEY: string;
  AUTOGOPAY_SECRET_KEY: string;
  QRIS_EXPIRY_MINUTES: string;
  CURRENCY_CODE: string;
  CURRENCY_SYMBOL: string;

  // System & Features
  MAINTENANCE_MODE: string;
  ANNOUNCEMENT_ACTIVE: string;
  ANNOUNCEMENT_TEXT: string;
  ANNOUNCEMENT_LINK: string;

  // Policies & Warranty
  DEFAULT_WARRANTY_DAYS: string;
  AUTO_REPLACEMENT_GLOBAL_ENABLE: string;
  TERMS_OF_SERVICE: string;
  PRIVACY_POLICY: string;
  REFUND_POLICY: string;

  // Telegram Admin Notification Configuration
  TELEGRAM_ENABLED: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_ADMIN_CHAT_ID: string;
  TELEGRAM_API_BASE_URL: string;
  TELEGRAM_NOTIF_ORDER_PAID: string;
  TELEGRAM_NOTIF_WAITING_STOCK: string;
  TELEGRAM_NOTIF_FULFILLMENT_FAILED: string;
  TELEGRAM_NOTIF_REPLACEMENT: string;
  TELEGRAM_NOTIF_LOW_STOCK: string;
  TELEGRAM_NOTIF_SUPPLIER_CLAIM: string;
  TELEGRAM_NOTIF_SYSTEM_ERROR: string;
  TELEGRAM_NOTIF_SECURITY: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettingsData = {
  STORE_NAME: 'Gogomi Store',
  STORE_TAGLINE: 'Toko Produk Digital Legal, Murah & Bergaransi',
  STORE_LOGO_URL: '',
  STORE_ICON_URL: '',
  STORE_FAVICON_URL: '',
  STORE_THEME_COLOR: '#06b6d4',

  SEO_TITLE: 'Gogomi Store — Toko Produk Digital Legal & Terpercaya',
  SEO_DESCRIPTION: 'Beli akun AI, lisensi software, aplikasi produktivitas, dan aset digital legal dengan pembayaran QRIS otomatis dan garansi terjamin.',
  SEO_KEYWORDS: 'produk digital, lisensi software, chatgpt plus, canva pro, spotify family, qris otomatis, autogopay',
  SEO_OG_IMAGE: '/og-image.png',
  SEO_TWITTER_CARD: 'summary_large_image',
  SEO_CANONICAL_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://gogomi.store',
  GOOGLE_ANALYTICS_ID: '',
  FACEBOOK_PIXEL_ID: '',
  GSC_VERIFICATION_CODE: '',

  SUPPORT_EMAIL: 'cs@gogomi.store',
  SUPPORT_WHATSAPP: '+6285178754012',
  SUPPORT_TELEGRAM: '@gogomistore_cs',
  SUPPORT_HOURS: 'Senin - Minggu: 08:00 - 23:00 WIB',
  STORE_ADDRESS: 'Jakarta, Indonesia',

  AUTOGOPAY_MERCHANT_ID: 'AGP-DEMO-99812',
  AUTOGOPAY_API_KEY: '',
  AUTOGOPAY_SECRET_KEY: '',
  QRIS_EXPIRY_MINUTES: '15',
  CURRENCY_CODE: 'IDR',
  CURRENCY_SYMBOL: 'Rp',

  MAINTENANCE_MODE: 'false',
  ANNOUNCEMENT_ACTIVE: 'false',
  ANNOUNCEMENT_TEXT: '⚡ Promo Merdeka Digital: Gunakan kupon GOGOMIHEMAT untuk diskon 15%!',
  ANNOUNCEMENT_LINK: '/products',

  DEFAULT_WARRANTY_DAYS: '30',
  AUTO_REPLACEMENT_GLOBAL_ENABLE: 'true',
  TERMS_OF_SERVICE: 'Syarat dan ketentuan layanan berlaku untuk seluruh transaksi produk digital di platform.',
  PRIVACY_POLICY: 'Kami berkomitmen menjaga kerahasiaan dan privasi seluruh data pelanggan.',
  REFUND_POLICY: 'Garansi penggantian instan jika produk mengalami kendala sebelum masa aktif habis.',

  TELEGRAM_ENABLED: 'true',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_ADMIN_CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
  TELEGRAM_API_BASE_URL: process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org',
  TELEGRAM_NOTIF_ORDER_PAID: 'true',
  TELEGRAM_NOTIF_WAITING_STOCK: 'true',
  TELEGRAM_NOTIF_FULFILLMENT_FAILED: 'true',
  TELEGRAM_NOTIF_REPLACEMENT: 'true',
  TELEGRAM_NOTIF_LOW_STOCK: 'true',
  TELEGRAM_NOTIF_SUPPLIER_CLAIM: 'true',
  TELEGRAM_NOTIF_SYSTEM_ERROR: 'true',
  TELEGRAM_NOTIF_SECURITY: 'true',
};

export class SiteSettingService {
  private static cachedSettings: SiteSettingsData | null = null;
  private static cacheExpiry: number = 0;

  /**
   * Retrieves all site settings merged with defaults
   */
  static async getAllSettings(): Promise<SiteSettingsData> {
    const now = Date.now();
    if (this.cachedSettings && this.cacheExpiry > now) {
      return this.cachedSettings;
    }

    try {
      const records = await db.siteSetting.findMany();
      const settingsMap: Record<string, string> = {};
      records.forEach((r) => {
        settingsMap[r.key] = r.value;
      });

      const merged = {
        ...DEFAULT_SITE_SETTINGS,
        ...settingsMap,
      };

      this.cachedSettings = merged;
      this.cacheExpiry = now + 30000; // 30s cache

      return merged;
    } catch {
      return DEFAULT_SITE_SETTINGS;
    }
  }

  /**
   * Retrieves a single setting by key
   */
  static async getSetting(key: keyof SiteSettingsData): Promise<string> {
    try {
      const record = await db.siteSetting.findUnique({ where: { key } });
      return record ? record.value : DEFAULT_SITE_SETTINGS[key] || '';
    } catch {
      return DEFAULT_SITE_SETTINGS[key] || '';
    }
  }

  /**
   * Updates multiple settings at once
   */
  static async updateSettings(settings: Partial<SiteSettingsData>): Promise<SiteSettingsData> {
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) {
        let category = 'GENERAL';
        if (key.startsWith('SEO_') || key.startsWith('GOOGLE_') || key.startsWith('GSC_') || key.startsWith('FACEBOOK_')) {
          category = 'SEO';
        } else if (key.startsWith('SUPPORT_')) {
          category = 'SUPPORT';
        } else if (key.startsWith('AUTOGOPAY_') || key.startsWith('QRIS_') || key.startsWith('CURRENCY_')) {
          category = 'PAYMENT';
        } else if (key.startsWith('ANNOUNCEMENT_') || key.startsWith('MAINTENANCE_')) {
          category = 'SYSTEM';
        } else if (key.startsWith('TELEGRAM_')) {
          category = 'TELEGRAM';
        }

        await db.siteSetting.upsert({
          where: { key },
          update: { value: String(value), category },
          create: { key, value: String(value), category },
        });
      }
    }

    // Invalidate in-memory cache so fresh values are read immediately
    this.cachedSettings = null;
    this.cacheExpiry = 0;

    return this.getAllSettings();
  }
}
