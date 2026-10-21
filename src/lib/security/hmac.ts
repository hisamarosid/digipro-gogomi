import crypto from 'crypto';

/**
 * Computes HMAC-SHA256 signature of a raw HTTP request body string
 */
export function generateHmacSignature(rawBody: string, secretKey: string): string {
  return crypto
    .createHmac('sha256', secretKey)
    .update(rawBody)
    .digest('hex');
}

/**
 * Verifies the AutoGoPay X-Signature using constant-time comparison to prevent timing attacks
 */
export function verifyHmacSignature(
  rawBody: string,
  providedSignature: string | null | undefined,
  secretKey: string
): boolean {
  if (!providedSignature || !secretKey || !rawBody) {
    return false;
  }

  const expectedSignature = generateHmacSignature(rawBody, secretKey);

  const sigBuffer = Buffer.from(providedSignature.toLowerCase(), 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature.toLowerCase(), 'utf8');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}
