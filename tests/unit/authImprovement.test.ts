import { describe, it, expect } from 'vitest';
import {
  isAllowedEmailDomain,
  validatePasswordStrength,
  generateSecureToken,
  hashToken,
  ALLOWED_CUSTOMER_EMAIL_DOMAINS,
  EMAIL_DOMAIN_ERROR_MESSAGE,
} from '../../src/lib/auth/validation';
import { EmailProviderService } from '../../src/services/email/email-provider.service';

describe('Auth & Email Verification Utilities', () => {
  describe('Customer Allowed Email Domains', () => {
    it('should allow valid domains: gmail, outlook, hotmail, yahoo', () => {
      expect(isAllowedEmailDomain('user@gmail.com')).toBe(true);
      expect(isAllowedEmailDomain('USER@GMAIL.COM')).toBe(true);
      expect(isAllowedEmailDomain('customer.pro@outlook.com')).toBe(true);
      expect(isAllowedEmailDomain('person@hotmail.com')).toBe(true);
      expect(isAllowedEmailDomain('buyer@yahoo.com')).toBe(true);
    });

    it('should reject unpermitted email domains with friendly error message', () => {
      expect(isAllowedEmailDomain('user@tempmail.com')).toBe(false);
      expect(isAllowedEmailDomain('hacker@disposable.org')).toBe(false);
      expect(isAllowedEmailDomain('admin@customdomain.io')).toBe(false);
      expect(isAllowedEmailDomain('user@yahoo.co.id')).toBe(false);
      expect(isAllowedEmailDomain('')).toBe(false);
      expect(isAllowedEmailDomain('invalid-email')).toBe(false);
      expect(EMAIL_DOMAIN_ERROR_MESSAGE).toBe('Gunakan email Gmail, Outlook, Hotmail, atau Yahoo.');
    });
  });

  describe('Password Requirements & Strength Validation', () => {
    it('should pass password meeting all 5 security criteria', () => {
      const result = validatePasswordStrength('GogomiStore2026!');
      expect(result.isValid).toBe(true);
      expect(result.hasMinLength).toBe(true);
      expect(result.hasUppercase).toBe(true);
      expect(result.hasLowercase).toBe(true);
      expect(result.hasNumber).toBe(true);
      expect(result.hasSpecial).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when password is shorter than 8 characters', () => {
      const result = validatePasswordStrength('Aa1!bcd');
      expect(result.isValid).toBe(false);
      expect(result.hasMinLength).toBe(false);
      expect(result.errors).toContain('Minimal 8 karakter');
    });

    it('should fail when password has no uppercase letter', () => {
      const result = validatePasswordStrength('gogomistore2026!');
      expect(result.isValid).toBe(false);
      expect(result.hasUppercase).toBe(false);
      expect(result.errors).toContain('Minimal 1 huruf besar');
    });

    it('should fail when password has no lowercase letter', () => {
      const result = validatePasswordStrength('GOGOMISTORE2026!');
      expect(result.isValid).toBe(false);
      expect(result.hasLowercase).toBe(false);
      expect(result.errors).toContain('Minimal 1 huruf kecil');
    });

    it('should fail when password has no number', () => {
      const result = validatePasswordStrength('GogomiStoreSecret!');
      expect(result.isValid).toBe(false);
      expect(result.hasNumber).toBe(false);
      expect(result.errors).toContain('Minimal 1 angka');
    });

    it('should fail when password has no special character', () => {
      const result = validatePasswordStrength('GogomiStore2026');
      expect(result.isValid).toBe(false);
      expect(result.hasSpecial).toBe(false);
      expect(result.errors).toContain('Minimal 1 karakter khusus');
    });
  });

  describe('Token Generation & SHA-256 Hashing', () => {
    it('should generate a 64-character hex cryptographically secure token', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();

      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toEqual(token2);
    });

    it('should produce deterministic SHA-256 hashes for tokens', () => {
      const rawToken = '7f8c9d0e1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d';
      const hash1 = hashToken(rawToken);
      const hash2 = hashToken(rawToken);

      expect(hash1).toHaveLength(64);
      expect(hash1).toEqual(hash2);
      expect(hash1).not.toEqual(rawToken);
    });
  });

  describe('SMTP & Email Provider Configuration', () => {
    it('should verify SMTP configuration structure without exposing secrets', async () => {
      const health = await EmailProviderService.verifySmtpConnection();
      expect(health).toBeDefined();
      expect(typeof health.configured).toBe('boolean');
      expect(typeof health.connected).toBe('boolean');
      expect(health.host).toBeDefined();
      expect(health.port).toBeDefined();
      expect(health.user).toBeDefined();
      expect(health.message).toBeDefined();
    });

    it('should safely capture emails in development or test environment', async () => {
      const sendResult = await EmailProviderService.sendEmail({
        recipientEmail: 'test@gmail.com',
        subject: 'Unit Test Email',
        html: '<p>Testing</p>',
        text: 'Testing',
      });

      expect(sendResult.success).toBe(true);
      expect(sendResult.providerMessageId).toBeDefined();
    });
  });
});
