import { describe, it, expect, beforeAll } from 'vitest';
import { signInvoice, verifyInvoice, newInvoiceId, type InvoicePayload } from '@/lib/security/invoice-token';

const base = (over: Partial<InvoicePayload> = {}): InvoicePayload => ({
  v: 1,
  id: newInvoiceId(),
  title: 'Pembuatan Website',
  amount: 800000,
  qty: 1,
  exp: Date.now() + 60_000,
  ...over,
});

beforeAll(() => {
  process.env.AUTH_SECRET = 'a'.repeat(48);
});

describe('invoice payment-link token', () => {
  it('round-trips a valid invoice', () => {
    const payload = base({ note: 'Termasuk 2x revisi' });
    expect(verifyInvoice(signInvoice(payload))).toEqual(payload);
  });

  it('rejects a tampered amount', () => {
    const token = signInvoice(base());
    const [body, sig] = token.split('.');
    const forged = JSON.parse(Buffer.from(body, 'base64url').toString());
    forged.amount = 1000;
    const forgedBody = Buffer.from(JSON.stringify(forged)).toString('base64url');
    expect(verifyInvoice(`${forgedBody}.${sig}`)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const token = signInvoice(base());
    process.env.AUTH_SECRET = 'b'.repeat(48);
    expect(verifyInvoice(token)).toBeNull();
    process.env.AUTH_SECRET = 'a'.repeat(48);
  });

  it('rejects expired links', () => {
    const token = signInvoice(base({ exp: Date.now() - 1 }));
    expect(verifyInvoice(token)).toBeNull();
  });

  it('rejects out-of-range or non-integer values even when correctly signed', () => {
    expect(verifyInvoice(signInvoice(base({ amount: 10 })))).toBeNull();
    expect(verifyInvoice(signInvoice(base({ amount: 1500.5 })))).toBeNull();
    expect(verifyInvoice(signInvoice(base({ amount: 999_999_999 })))).toBeNull();
    expect(verifyInvoice(signInvoice(base({ qty: 0 })))).toBeNull();
    expect(verifyInvoice(signInvoice(base({ title: '   ' })))).toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifyInvoice('')).toBeNull();
    expect(verifyInvoice('abc')).toBeNull();
    expect(verifyInvoice('a.b')).toBeNull();
  });
});
