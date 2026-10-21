import { NextResponse } from 'next/server';
import { SiteSettingService } from '@/services/siteSetting.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await SiteSettingService.getAllSettings();
    // Return sanitized public settings (exclude secret payment keys)
    const publicSettings = {
      STORE_NAME: settings.STORE_NAME,
      STORE_TAGLINE: settings.STORE_TAGLINE,
      STORE_LOGO_URL: settings.STORE_LOGO_URL,
      STORE_ICON_URL: settings.STORE_ICON_URL,
      STORE_FAVICON_URL: settings.STORE_FAVICON_URL,
      STORE_THEME_COLOR: settings.STORE_THEME_COLOR,
      SEO_TITLE: settings.SEO_TITLE,
      SEO_DESCRIPTION: settings.SEO_DESCRIPTION,
      SEO_KEYWORDS: settings.SEO_KEYWORDS,
      SEO_OG_IMAGE: settings.SEO_OG_IMAGE,
      SEO_TWITTER_CARD: settings.SEO_TWITTER_CARD,
      SUPPORT_EMAIL: settings.SUPPORT_EMAIL,
      SUPPORT_WHATSAPP: settings.SUPPORT_WHATSAPP,
      SUPPORT_TELEGRAM: settings.SUPPORT_TELEGRAM,
      SUPPORT_HOURS: settings.SUPPORT_HOURS,
      STORE_ADDRESS: settings.STORE_ADDRESS,
      CURRENCY_CODE: settings.CURRENCY_CODE,
      CURRENCY_SYMBOL: settings.CURRENCY_SYMBOL,
      MAINTENANCE_MODE: settings.MAINTENANCE_MODE,
      ANNOUNCEMENT_ACTIVE: settings.ANNOUNCEMENT_ACTIVE,
      ANNOUNCEMENT_TEXT: settings.ANNOUNCEMENT_TEXT,
      ANNOUNCEMENT_LINK: settings.ANNOUNCEMENT_LINK,
      DEFAULT_WARRANTY_DAYS: settings.DEFAULT_WARRANTY_DAYS,
    };

    return NextResponse.json({ success: true, data: publicSettings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
