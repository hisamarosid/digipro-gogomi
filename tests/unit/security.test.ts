import { describe, it, expect } from 'vitest';
import { encryptPayload, decryptPayload } from '../../src/lib/security/encryption';
import { generateHmacSignature, verifyHmacSignature } from '../../src/lib/security/hmac';

describe('Security & Encryption Utilities', () => {
  it('should encrypt and decrypt sensitive inventory payload accurately with AES-256-GCM', () => {
    const rawSecret = 'Email: gpt_user1@digipro.store | Pass: SuperSecret123!';
    const encrypted = encryptPayload(rawSecret);

    expect(encrypted.cipher).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    expect(encrypted.cipher).not.toEqual(rawSecret);

    const decrypted = decryptPayload(encrypted);
    expect(decrypted).toEqual(rawSecret);
  });

  it('should compute valid HMAC-SHA256 signature on raw request body', () => {
    const rawBody = JSON.stringify({ amount: 10000, transaction_id: 'AGP-12345' });
    const secretKey = 'my_secret_key';

    const signature = generateHmacSignature(rawBody, secretKey);
    expect(signature).toBeDefined();
    expect(typeof signature).toBe('string');
    expect(signature.length).toBe(64); // SHA-256 hex string length

    const isValid = verifyHmacSignature(rawBody, signature, secretKey);
    expect(isValid).toBe(true);
  });

  it('should reject invalid HMAC signature or tampered request body', () => {
    const rawBody = JSON.stringify({ amount: 10000, transaction_id: 'AGP-12345' });
    const tamperedBody = JSON.stringify({ amount: 50000, transaction_id: 'AGP-12345' });
    const secretKey = 'my_secret_key';

    const signature = generateHmacSignature(rawBody, secretKey);

    // Tampered body should fail verification
    const isValid = verifyHmacSignature(tamperedBody, signature, secretKey);
    expect(isValid).toBe(false);
  });
});
