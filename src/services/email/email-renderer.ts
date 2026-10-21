import { SafeEmailTemplateData, EmailRenderResult } from './email-types';

export class EmailRenderer {
  /**
   * Sanitizes template data by removing forbidden sensitive keys
   */
  private static sanitizeTemplateData(data: SafeEmailTemplateData): SafeEmailTemplateData {
    const clean: SafeEmailTemplateData = {};
    for (const [key, val] of Object.entries(data)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('password') ||
        lower.includes('credential') ||
        lower.includes('pin') ||
        lower.includes('license') ||
        lower.includes('secret') ||
        lower.includes('api_key')
      ) {
        continue;
      }
      clean[key] = val;
    }
    return clean;
  }

  /**
   * Interpolates template string placeholders safely with fallbacks
   */
  public static formatString(str: string, data: SafeEmailTemplateData): string {
    if (!str) return '';
    const clean = this.sanitizeTemplateData(data || {});

    // Intelligent standard defaults
    const defaults: Record<string, string> = {
      customerName: clean.customerName || 'Pelanggan',
      productName: clean.productName || 'Produk Digital',
      variantName: clean.variantName || '-',
      orderNumber: clean.orderNumber || '-',
      paymentMethod: clean.paymentMethod || 'QRIS',
    };

    let result = str;

    // 1. Replace all explicit keys from clean data
    for (const [key, val] of Object.entries(clean)) {
      if (val !== undefined && val !== null && val !== '') {
        const formattedVal =
          typeof val === 'number' && (key.includes('amount') || key.includes('Price') || key.includes('Cost'))
            ? `Rp${val.toLocaleString('id-ID')}`
            : String(val);

        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        result = result.replace(regex, formattedVal);
      }
    }

    // 2. Replace any known standard defaults if not yet replaced
    for (const [key, val] of Object.entries(defaults)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, val);
    }

    // 3. Clean up any remaining unpopulated {{...}} placeholders
    result = result.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, '');

    return result.trim();
  }

  /**
   * Generates production-ready, email-client safe HTML & Text
   */
  public static renderBaseTemplate(params: {
    subject: string;
    title: string;
    bodyContent: string;
    infoRows?: { label: string; value: string }[];
    ctaText?: string;
    ctaUrl?: string;
    footerNote?: string;
    data: SafeEmailTemplateData;
  }): EmailRenderResult {
    const cleanData = this.sanitizeTemplateData(params.data);
    const formattedSubject = this.formatString(params.subject, cleanData);
    const formattedTitle = this.formatString(params.title, cleanData);
    const formattedBody = this.formatString(params.bodyContent, cleanData);

    const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://gogomi.store').replace(/\/$/, '');
    let rawCta = params.ctaUrl ? this.formatString(params.ctaUrl, cleanData) : '';
    if (!rawCta || rawCta.trim() === '') {
      rawCta = String(
        cleanData.verificationUrl ||
        cleanData.resetUrl ||
        cleanData.actionUrl ||
        cleanData.url ||
        ''
      );
    }

    const finalCtaUrl = rawCta && rawCta.trim() !== ''
      ? rawCta.startsWith('http://') || rawCta.startsWith('https://')
        ? rawCta
        : `${appUrl}${rawCta.startsWith('/') ? '' : '/'}${rawCta}`
      : '';

    const processedRows = (params.infoRows || [])
      .map((r) => ({
        label: this.formatString(r.label, cleanData),
        value: this.formatString(r.value, cleanData),
      }))
      .filter((r) => r.value && r.value.trim() !== '' && r.value !== '-');

    const ctaTextResolved = params.ctaText ? this.formatString(params.ctaText, cleanData) : 'KLIK DI SINI';

    // HTML Output with 100% Inline CSS for Gmail, Outlook, Yahoo & Apple Mail
    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${formattedSubject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px 10px; color: #1e293b;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr>
      <td style="background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 4px solid #06b6d4;">
        <div style="color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Gogomi<span style="color: #38bdf8;"> Store</span>
        </div>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 32px 28px;">
        <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${formattedTitle}</h1>
        <div style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${formattedBody}</div>

        ${
          processedRows.length > 0
            ? `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; margin-bottom: 24px;">
            ${processedRows
              .map(
                (r) => `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #64748b; font-weight: 500; font-family: sans-serif;">${r.label}</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right; font-family: sans-serif;">${r.value}</td>
              </tr>
            `
              )
              .join('')}
          </table>
        `
            : ''
        }

        ${
          finalCtaUrl
            ? `
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 16px 0;">
            <tr>
              <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate;">
                  <tr>
                    <td align="center" bgcolor="#06b6d4" style="border-radius: 10px; background-color: #06b6d4;">
                      <a href="${finalCtaUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 800; color: #ffffff !important; text-decoration: none; border-radius: 10px; background-color: #06b6d4; border: 1px solid #0891b2; letter-spacing: 0.5px;">
                        ${ctaTextResolved}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 12px; font-size: 11px; color: #64748b; font-family: sans-serif;">
            Jika tombol tidak dapat diklik, salin dan buka tautan ini di browser Anda:<br>
            <a href="${finalCtaUrl}" target="_blank" style="color: #0284c7; word-break: break-all;">${finalCtaUrl}</a>
          </div>
        `
            : ''
        }
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; font-family: sans-serif;">
        <p style="margin: 0 0 6px 0;"><strong>Gogomi Digital Store</strong> &bull; Toko Produk Digital Legal & Terpercaya</p>
        <p style="margin: 0;">Butuh bantuan? Hubungi CS di <a href="mailto:support@gogomi.store" style="color: #0284c7; text-decoration: none; font-weight: 600;">support@gogomi.store</a></p>
        ${params.footerNote ? `<p style="margin-top: 8px; font-size: 11px; color: #94a3b8;">${params.footerNote}</p>` : ''}
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Plaintext Fallback Output
    let text = `${formattedTitle.toUpperCase()}\n\n${formattedBody}\n\n`;

    if (processedRows.length > 0) {
      for (const row of processedRows) {
        text += `${row.label}: ${row.value}\n`;
      }
      text += '\n';
    }

    if (finalCtaUrl) {
      text += `${ctaTextResolved}: ${finalCtaUrl}\n\n`;
    }

    text += `---\nGogomi Digital Store | support@gogomi.store`;

    return {
      subject: formattedSubject,
      html,
      text,
    };
  }
}
