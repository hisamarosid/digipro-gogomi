import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramService } from '../../src/services/telegram.service';
import { SiteSettingService, DEFAULT_SITE_SETTINGS } from '../../src/services/siteSetting.service';
import { db } from '../../src/lib/db/prisma';

describe('Telegram Admin Notification System Tests', () => {
  const inMemoryLogs = new Map<string, any>();

  beforeEach(() => {
    vi.restoreAllMocks();
    inMemoryLogs.clear();

    // Mock SiteSettings to avoid DB roundtrip in unit test
    vi.spyOn(SiteSettingService, 'getAllSettings').mockResolvedValue({
      ...DEFAULT_SITE_SETTINGS,
      TELEGRAM_ENABLED: 'true',
      TELEGRAM_BOT_TOKEN: '123456789:TEST_TOKEN_REPLACE_ME',
      TELEGRAM_ADMIN_CHAT_ID: '5458371268',
    });

    // Mock db.telegramNotificationLog
    (db as any).telegramNotificationLog = {
      findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
        return inMemoryLogs.get(where.dedupeKey) || null;
      }),
      upsert: vi.fn().mockImplementation(async ({ where, create, update }: any) => {
        const existing = inMemoryLogs.get(where.dedupeKey);
        const record = existing ? { ...existing, ...update } : { id: 'mock-id', ...create };
        inMemoryLogs.set(where.dedupeKey, record);
        return record;
      }),
    };

    // Mock AuditLog to avoid DB roundtrip
    vi.spyOn(db.auditLog, 'create').mockResolvedValue({ id: 'mock-audit-id' } as any);
  });

  it('1. HTML escaping and PII masking should work securely', () => {
    // Test HTML Escaping
    expect(TelegramService.escapeHtml('Gogomi <Store> & "Digital"')).toBe('Gogomi &lt;Store&gt; &amp; &quot;Digital&quot;');
    expect(TelegramService.escapeHtml('')).toBe('');
    expect(TelegramService.escapeHtml(null)).toBe('');

    // Test Email Masking
    expect(TelegramService.maskEmail('fadli@gogomi.store')).toBe('f***i@gogomi.store');
    expect(TelegramService.maskEmail('cs@gogomi.store')).toBe('c***@gogomi.store');
    expect(TelegramService.maskEmail('test.user123@gmail.com')).toBe('t***3@gmail.com');
    expect(TelegramService.maskEmail(null)).toBe('-');

    // Test Phone Masking
    expect(TelegramService.maskPhone('081234567890')).toBe('081******7890');
    expect(TelegramService.maskPhone('+6281234567890')).toBe('+62******7890');
    expect(TelegramService.maskPhone(null)).toBe('-');
  });

  it('2. TelegramService.sendMessage should dispatch HTTP request and record delivery log', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 12345 } }),
    });
    global.fetch = mockFetch;

    const dedupeKey = `TEST_DEDUPE_${Date.now()}`;
    const res = await TelegramService.sendMessage({
      eventType: 'ORDER_PAID',
      entityType: 'Order',
      entityId: 'ord-123',
      dedupeKey,
      text: '<b>[GOGOMI STORE]</b>\n\n🛒 <b>ORDER BARU DIBAYAR</b>',
      actionUrl: '/admin/orders/ord-123',
    });

    expect(res.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('3. Deduplication should prevent duplicate notifications for same key', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 67890 } }),
    });
    global.fetch = mockFetch;

    const dedupeKey = `ORDER_PAID:ord-duplicate-test-${Date.now()}`;

    // First send
    const res1 = await TelegramService.sendMessage({
      eventType: 'ORDER_PAID',
      dedupeKey,
      text: 'Order 1',
    });
    expect(res1.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second send with same dedupeKey should be skipped
    const res2 = await TelegramService.sendMessage({
      eventType: 'ORDER_PAID',
      dedupeKey,
      text: 'Order 1 Duplicate',
    });
    expect(res2.success).toBe(true);
    // Fetch should still only be called once
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('4. sendOrderPaidNotification formats order details and masks customer info', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 99999 } }),
    });
    global.fetch = mockFetch;

    const res = await TelegramService.sendOrderPaidNotification({
      id: `ord-test-${Date.now()}`,
      orderNumber: 'GS-2026-TEST',
      grandTotal: 150000,
      cashPayableAmount: 150000,
      user: { email: 'customer_vip@gmail.com', name: 'John Doe' },
      items: [
        { productName: 'ChatGPT Plus Shared', variantName: '1 Bulan', quantity: 1 },
        { productName: 'Canva Pro Invite', variantName: '1 Tahun', quantity: 2 },
      ],
    });

    expect(res.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callPayload = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callPayload.text).toContain('ORDER BARU DIBAYAR');
    expect(callPayload.text).toContain('#GS-2026-TEST');
    expect(callPayload.text).toContain('c***p@gmail.com');
    expect(callPayload.text).toContain('ChatGPT Plus Shared');
    expect(callPayload.text).toContain('Canva Pro Invite');
    expect(callPayload.text).toContain('PAID / SETTLEMENT');
  });

  it('5. Safe side-effect guarantee: network failure should not throw or crash callers', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network connection timeout'));
    global.fetch = mockFetch;

    const dedupeKey = `FAIL_TEST_${Date.now()}`;
    const res = await TelegramService.sendMessage({
      eventType: 'CRON_FAILED',
      dedupeKey,
      text: 'Cron failed test',
    });

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
