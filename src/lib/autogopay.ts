import { verifyHmacSignature } from './security/hmac';

export interface GenerateQRISRequest {
  amount: number;
}

export interface GenerateQRISResponse {
  success: boolean;
  data?: {
    transaction_id: string;
    order_id?: string;
    amount: number;
    transaction_status: string;
    qr_string?: string;
    qr_url?: string;
    checkout_url?: string;
    transaction_time?: string;
    expiry_time?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface QRISStatusResponse {
  success: boolean;
  data?: {
    transaction_id: string;
    order_id?: string;
    amount: number;
    transaction_status: 'pending' | 'settlement' | 'expire' | 'cancel' | string;
    status?: string;
    paid?: boolean;
    payment_type?: string;
    settlement_time?: string;
    paid_at?: string;
    transactions?: Array<any>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export class AutoGoPaySDK {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.AUTOGOPAY_BASE_URL || 'https://v1-gateway.autogopay.site';
    this.apiKey = process.env.AUTOGOPAY_API_KEY || '';
  }

  getApiKey(): string {
    return process.env.AUTOGOPAY_API_KEY || this.apiKey || '';
  }

  getBaseUrl(): string {
    return process.env.AUTOGOPAY_BASE_URL || this.baseUrl || 'https://v1-gateway.autogopay.site';
  }

  async getApiKeyAsync(): Promise<string> {
    if (process.env.AUTOGOPAY_API_KEY) return process.env.AUTOGOPAY_API_KEY.trim();
    if (this.apiKey) return this.apiKey.trim();
    try {
      const { db } = await import('./db/prisma');
      const setting = await db.siteSetting.findUnique({ where: { key: 'AUTOGOPAY_API_KEY' } });
      if (setting?.value && setting.value.trim()) return setting.value.trim();
      const secretSetting = await db.siteSetting.findUnique({ where: { key: 'AUTOGOPAY_SECRET_KEY' } });
      if (secretSetting?.value && secretSetting.value.trim()) return secretSetting.value.trim();
    } catch {}
    return '';
  }

  private async getHeadersAsync(): Promise<HeadersInit> {
    const key = await this.getApiKeyAsync();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    };
  }

  /**
   * Calls AutoGoPay with smart multi-channel support (GoPay / ShopeePay / Interactive / InstaQRIS)
   */
  async generateQRIS(amount: number): Promise<GenerateQRISResponse> {
    const roundedAmount = Math.round(amount);
    if (roundedAmount < 1 || roundedAmount > 10000000) {
      return {
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Nominal pembayaran harus berada di antara Rp 1 dan Rp 10.000.000',
        },
      };
    }

    const key = await this.getApiKeyAsync();
    const url = this.getBaseUrl();

    if (!key) {
      if (process.env.NODE_ENV === 'production') {
        return {
          success: false,
          error: {
            code: 'CONFIG_ERROR',
            message: 'API Key AutoGoPay belum dikonfigurasi di Pengaturan Sistem',
          },
        };
      }

      console.warn('[AutoGoPaySDK] AUTOGOPAY_API_KEY is not set. Operating in local dev mode.');
      const mockTxId = `AGP-DEV-${Date.now()}`;
      return {
        success: true,
        data: {
          transaction_id: mockTxId,
          order_id: `AUTOGOPAY-${Date.now()}`,
          amount: roundedAmount,
          transaction_status: 'pending',
          qr_string: '00020101021126610014COM.GO-JEK.WWW01189360091436609320870210G6609320870303UMI51440014ID.CO.QRIS.WWW0215ID10265487566950303UMI5204581653033605802ID5911Gogo Gaming6007BANDUNG61054013562070703A01630445B8',
          qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=AUTOGOPAY-DEV-${mockTxId}`,
          checkout_url: `${process.env.APP_URL || 'http://localhost:3000'}/payment/mock-${mockTxId}`,
          transaction_time: new Date().toISOString(),
          expiry_time: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        },
      };
    }

    const headers = await this.getHeadersAsync();
    const errors: string[] = [];

    // 1. Try GoPay Endpoint (/qris/generate)
    try {
      const gopayRes = await fetch(`${url}/qris/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount: roundedAmount }),
      });
      const gopayData = await gopayRes.json().catch(() => null);

      if (gopayRes.ok && gopayData && gopayData.success !== false && (gopayData.data || gopayData.qr_string || gopayData.qr_url)) {
        const d = gopayData.data || gopayData;
        return {
          success: true,
          data: {
            transaction_id: d.transaction_id || d.id || d.order_id || `AGP-${Date.now()}`,
            order_id: d.order_id,
            amount: Number(d.amount) || roundedAmount,
            transaction_status: d.transaction_status || d.status || 'pending',
            qr_string: d.qr_string || d.qrString || undefined,
            qr_url: d.qr_url || d.qrUrl || undefined,
            checkout_url: d.checkout_url || d.checkoutUrl || undefined,
            transaction_time: d.transaction_time || d.time || new Date().toISOString(),
            expiry_time: d.expiry_time || d.expired_time || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          },
        };
      } else {
        const msg = gopayData?.message || `HTTP ${gopayRes.status}`;
        errors.push(`GoPay: ${msg}`);
      }
    } catch (e: any) {
      errors.push(`GoPay network: ${e.message}`);
    }

    // 2. Try ShopeePay Endpoint (/shopeepay/qris/create)
    try {
      const spRes = await fetch(`${url}/shopeepay/qris/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount: roundedAmount }),
      });
      const spData = await spRes.json().catch(() => null);

      if (spRes.ok && spData && spData.success !== false && (spData.data || spData.qr_string || spData.qr_url)) {
        const d = spData.data || spData;
        return {
          success: true,
          data: {
            transaction_id: d.order_sn || d.transaction_id || d.id || `SPP-${Date.now()}`,
            order_id: d.order_sn,
            amount: Number(d.amount) || roundedAmount,
            transaction_status: 'pending',
            qr_string: d.qr_string || d.qrString || undefined,
            qr_url: d.qr_url || d.qrUrl || undefined,
            checkout_url: d.checkout_url || d.checkoutUrl || undefined,
            transaction_time: d.transaction_time || new Date().toISOString(),
            expiry_time: d.expiry_time || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          },
        };
      } else if (spData?.message) {
        errors.push(`ShopeePay: ${spData.message}`);
      }
    } catch (e: any) {
      errors.push(`ShopeePay network: ${e.message}`);
    }

    // 3. Try Interactive QRIS Endpoint (/interactive/qris/create)
    try {
      const intrRes = await fetch(`${url}/interactive/qris/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount: roundedAmount }),
      });
      const intrData = await intrRes.json().catch(() => null);

      if (intrRes.ok && intrData && intrData.success !== false && (intrData.data || intrData.qr_string || intrData.qr_url)) {
        const d = intrData.data || intrData;
        return {
          success: true,
          data: {
            transaction_id: d.invoice_id || d.ref_no || `INTR-${Date.now()}`,
            order_id: d.ref_no || d.invoice_id,
            amount: Number(d.amount) || roundedAmount,
            transaction_status: 'pending',
            qr_string: d.qr_string || d.qrString || undefined,
            qr_url: d.qr_url || d.qrUrl || undefined,
            checkout_url: d.checkout_url || undefined,
            transaction_time: d.timestamp || new Date().toISOString(),
            expiry_time: d.expired_date || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          },
        };
      } else if (intrData?.message) {
        errors.push(`Interactive: ${intrData.message}`);
      }
    } catch (e: any) {
      errors.push(`Interactive network: ${e.message}`);
    }

    // 4. Try InstaQRIS Endpoint (/instaqris/create)
    try {
      const instaRes = await fetch(`${url}/instaqris/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount: roundedAmount }),
      });
      const instaData = await instaRes.json().catch(() => null);

      if (instaRes.ok && instaData && instaData.success !== false && (instaData.data || instaData.qr_url)) {
        const d = instaData.data || instaData;
        return {
          success: true,
          data: {
            transaction_id: d.bill_number || `INSTA-${Date.now()}`,
            order_id: d.bill_number,
            amount: Number(d.amount) || roundedAmount,
            transaction_status: 'pending',
            qr_string: d.qr_string || undefined,
            qr_url: d.qr_url || undefined,
            checkout_url: undefined,
            transaction_time: new Date().toISOString(),
            expiry_time: new Date(Date.now() + (d.expires_in || 900) * 1000).toISOString(),
          },
        };
      } else if (instaData?.message) {
        errors.push(`InstaQRIS: ${instaData.message}`);
      }
    } catch (e: any) {
      errors.push(`InstaQRIS network: ${e.message}`);
    }

    console.error('[AutoGoPaySDK] All QRIS creation attempts failed:', errors);
    const primaryError = errors[0] || 'Gateway tidak merespons';
    return {
      success: false,
      error: {
        code: 'GATEWAY_ERROR',
        message: `${primaryError}. Pastikan akun QRIS / GoPay di dashboard autogopay.site dalam status terhubung (Connected).`,
      },
    };
  }

  /**
   * Calls AutoGoPay status APIs (supporting GoPay, ShopeePay & Interactive)
   */
  async getQRISStatus(transactionId: string): Promise<QRISStatusResponse> {
    const key = await this.getApiKeyAsync();
    const url = this.getBaseUrl();

    if (!key) {
      return {
        success: true,
        data: {
          transaction_id: transactionId,
          amount: 10000,
          transaction_status: 'pending',
        },
      };
    }

    const headers = await this.getHeadersAsync();

    // 1. Try GoPay /qris/status
    try {
      const response = await fetch(`${url}/qris/status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ transaction_id: transactionId }),
      });

      const resData = await response.json().catch(() => null);

      if (response.ok && resData && resData.success !== false) {
        const d = resData.data || resData;
        let normalizedTx: any = d;
        if (Array.isArray(d.transactions) && d.transactions.length > 0) {
          normalizedTx = d.transactions[0];
        }

        const rawStatus = normalizedTx.transaction_status || normalizedTx.status || (normalizedTx.paid ? 'settlement' : 'pending');
        return {
          success: true,
          data: {
            transaction_id: normalizedTx.transaction_id || normalizedTx.id || transactionId,
            order_id: normalizedTx.order_id,
            amount: Number(normalizedTx.amount) || 0,
            transaction_status: rawStatus,
            status: normalizedTx.status || normalizedTx.transaction_status,
            paid: normalizedTx.paid ?? (rawStatus === 'settlement' || rawStatus === 'PAID'),
            payment_type: normalizedTx.payment_type || normalizedTx.payment_method,
            settlement_time: normalizedTx.settlement_time || normalizedTx.paid_at,
            paid_at: normalizedTx.paid_at || normalizedTx.settlement_time,
            transactions: d.transactions,
          },
        };
      }
    } catch {}

    // 2. Try ShopeePay status (/shopeepay/qris/status?order_sn=...)
    try {
      const spStatusRes = await fetch(`${url}/shopeepay/qris/status?order_sn=${encodeURIComponent(transactionId)}`, {
        headers,
      });
      const spStatusData = await spStatusRes.json().catch(() => null);
      if (spStatusRes.ok && spStatusData?.data) {
        const d = spStatusData.data;
        return {
          success: true,
          data: {
            transaction_id: d.order_sn || transactionId,
            order_id: d.order_sn,
            amount: Number(d.amount) || 0,
            transaction_status: d.paid ? 'settlement' : 'pending',
            status: d.status,
            paid: Boolean(d.paid),
            settlement_time: d.paid_at,
            paid_at: d.paid_at,
          },
        };
      }
    } catch {}

    return {
      success: true,
      data: {
        transaction_id: transactionId,
        amount: 0,
        transaction_status: 'pending',
      },
    };
  }

  /**
   * Verifies incoming webhook HMAC signature against raw request body
   */
  async verifyWebhookSignatureAsync(rawBody: string, signature: string | null): Promise<boolean> {
    if (!signature || !rawBody) return false;
    const key = await this.getApiKeyAsync();
    if (!key) return false;
    return verifyHmacSignature(rawBody, signature, key);
  }

  /**
   * Synchronous signature check (fallback if key already in env)
   */
  /**
   * Fetches recent transactions from AutoGoPay gateway
   */
  async getRecentTransactions(): Promise<{ success: boolean; transactions: any[]; error?: string }> {
    const key = await this.getApiKeyAsync();
    const url = this.getBaseUrl();
    if (!key) {
      return { success: false, transactions: [], error: 'API_KEY_MISSING' };
    }

    try {
      const response = await fetch(`${url}/transactions`, {
        method: 'POST',
        headers: await this.getHeadersAsync(),
      });

      const resData = await response.json().catch(() => null);
      if (response.ok && resData && resData.success && Array.isArray(resData.data?.transactions)) {
        return {
          success: true,
          transactions: resData.data.transactions,
        };
      }
      return {
        success: false,
        transactions: [],
        error: resData?.message || `HTTP ${response.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        transactions: [],
        error: err.message,
      };
    }
  }
}

export const autoGoPay = new AutoGoPaySDK();
