import crypto from 'crypto';

export const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
] as const;

export const EMAIL_DOMAIN_ERROR_MESSAGE =
  'Gunakan email Gmail, Outlook, Hotmail, atau Yahoo.';

/**
 * Checks if the email ends with an allowed domain (case-insensitive)
 */
export function isAllowedEmailDomain(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = trimmed.slice(atIndex + 1);
  return ALLOWED_EMAIL_DOMAINS.includes(domain as any);
}

export interface PasswordStrengthResult {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
  errors: string[];
}

/**
 * Validates password according to the 5 standard rules:
 * 1. Minimal 8 karakter
 * 2. Huruf besar
 * 3. Huruf kecil
 * 4. Angka
 * 5. Karakter khusus
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const pwd = password || '';
  const hasMinLength = pwd.length >= 8;
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasLowercase = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  const errors: string[] = [];
  if (!hasMinLength) errors.push('Minimal 8 karakter');
  if (!hasUppercase) errors.push('Minimal 1 huruf besar');
  if (!hasLowercase) errors.push('Minimal 1 huruf kecil');
  if (!hasNumber) errors.push('Minimal 1 angka');
  if (!hasSpecial) errors.push('Minimal 1 karakter khusus');

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    isValid: hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial,
    errors,
  };
}

/**
 * Generates a cryptographically secure random token (32 bytes hex)
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a token using SHA-256 for secure database storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
