import crypto from 'crypto';

/**
 * Formats a numeric value into Indonesian Rupiah (IDR) format.
 * Example: 25000 -> "Rp25.000", 1250000 -> "Rp1.250.000"
 */
export function formatIDR(amount: number): string {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount);
  return `Rp${formatted}`;
}

/**
 * Formats a Date object or string into Asia/Jakarta locale date string
 */
export function formatDateJakarta(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

/**
 * Generates a cryptographically secure random order number.
 * Format: ORD-YYMMDD-XXXXXX (e.g. ORD-260813-X7K29A)
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
  const randomChars = crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase()
    .slice(0, 6);
  return `ORD-${dateStr}-${randomChars}`;
}

/**
 * Generates a support ticket number.
 * Format: TCK-YYMMDD-XXXX
 */
export function generateTicketNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  const randomChars = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `TCK-${dateStr}-${randomChars}`;
}

/**
 * Generates an opaque random hex token for guest orders or download access
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Partially masks a customer name for privacy in public reviews & social proof.
 * Examples:
 * - "Ndlodok" -> "Nd***ok"
 * - "Fadli" -> "Fa***i"
 * - "Budi Santoso" -> "Bu*** Sa***so"
 * - "Alex" -> "A**x"
 * - "Ani" -> "A*i"
 */
export function maskCustomerName(name: string | null | undefined): string {
  if (!name || name.trim().length === 0) return 'Pelanggan';
  const trimmed = name.trim();

  // If already masked (contains asterisks), return as is
  if (trimmed.includes('*')) return trimmed;

  const parts = trimmed.split(/\s+/);
  if (parts.length > 1) {
    return parts.map((part) => maskSingleName(part)).join(' ');
  }
  return maskSingleName(trimmed);
}

function maskSingleName(word: string): string {
  if (word.length <= 1) return word;
  if (word.length === 2) return `${word[0]}*`;
  if (word.length === 3) return `${word[0]}*${word[2]}`;
  if (word.length === 4) return `${word[0]}**${word[3]}`;

  const startLen = 2;
  const endLen = word.length >= 6 ? 2 : 1;
  const maskedCount = Math.max(3, word.length - startLen - endLen);
  return `${word.slice(0, startLen)}${'*'.repeat(maskedCount)}${word.slice(word.length - endLen)}`;
}
