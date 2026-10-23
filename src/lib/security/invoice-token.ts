import crypto from 'crypto';

/**
 * A "payment link" is a signed, self-contained invoice. Nothing is stored until the customer opens it,
 * so it never touches the database schema and the normal 15-minute QRIS window starts only when they pay.
 * The payload deliberately carries no personal data: the customer types their own contact details.
 */
export interface InvoicePayload {
  v: 1;
  id: string; // random link id, also used to find the order(s) created from it
  title: string;
  amount: number; // IDR per unit
  qty: number;
  note?: string;
  exp: number; // unix ms
}

export const INVOICE_LIMITS = {
  minAmount: 1000,
  maxAmount: 100_000_000,
  maxQty: 99,
  maxTitle: 120,
  maxNote: 500,
  maxDays: 30,
};

function toBase64Url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

function signingKey(): string {
  const secret = (process.env.AUTH_SECRET || '').trim();
  if (secret.length < 32) {
    throw new Error('AUTH_SECRET belum dikonfigurasi dengan benar.');
  }
  // Separate purpose from session cookies so one can never be replayed as the other.
  return `invoice-link:${secret}`;
}

function mac(data: string): Buffer {
  return crypto.createHmac('sha256', signingKey()).update(data).digest();
}

export function newInvoiceId(): string {
  return crypto.randomBytes(9).toString('base64url');
}

export function signInvoice(payload: InvoicePayload): string {
  const body = toBase64Url(JSON.stringify(payload));
  return `${body}.${toBase64Url(mac(body))}`;
}

export function verifyInvoice(token: string, now: number = Date.now()): InvoicePayload | null {
  try {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;

    const expected = mac(body);
    const given = Buffer.from(sig, 'base64url');
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;

    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as InvoicePayload;
    if (
      p?.v !== 1 ||
      typeof p.id !== 'string' || p.id.length < 6 || p.id.length > 40 ||
      typeof p.title !== 'string' || !p.title.trim() || p.title.length > INVOICE_LIMITS.maxTitle ||
      !Number.isInteger(p.amount) || p.amount < INVOICE_LIMITS.minAmount || p.amount > INVOICE_LIMITS.maxAmount ||
      !Number.isInteger(p.qty) || p.qty < 1 || p.qty > INVOICE_LIMITS.maxQty ||
      (p.note !== undefined && (typeof p.note !== 'string' || p.note.length > INVOICE_LIMITS.maxNote)) ||
      !Number.isFinite(p.exp) || p.exp <= now
    ) {
      return null;
    }
    return p;
  } catch {
    return null;
  }
}
