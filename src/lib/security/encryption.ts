import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for AES-GCM
const DEFAULT_KEY_STRING = '32-character-encryption-key-for-payload';

function getEncryptionKey(): Buffer {
  const keyStr = process.env.ENCRYPTION_KEY || DEFAULT_KEY_STRING;
  return crypto.createHash('sha256').update(keyStr).digest();
}

export interface EncryptedPayload {
  cipher: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypts a sensitive string (e.g. License key, Password, Download URL) using AES-256-GCM
 */
export function encryptPayload(text: string): EncryptedPayload {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    cipher: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload back to original plain text.
 * Universal multi-algorithm & multi-key fallback strategy.
 */
export function decryptPayload(payload: any): string {
  if (!payload) return '';

  let target = payload;

  // If payload is passed as a string, attempt to parse JSON objects
  if (typeof target === 'string') {
    const trimmed = target.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          target = parsed;
        }
      } catch {
        // Plain text string (unencrypted)
        return payload;
      }
    }
  }

  // Handle double-stringified JSON
  while (typeof target === 'string') {
    const trimmed = target.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          target = parsed;
        } else {
          break;
        }
      } catch {
        break;
      }
    } else {
      break;
    }
  }

  if (typeof target !== 'object' || !target) {
    return typeof payload === 'string' ? payload : JSON.stringify(payload);
  }

  const cipher = target.cipher || target.payloadCipher;
  const iv = target.iv || target.payloadIv;
  const authTag = target.authTag || target.payloadAuthTag;

  // If missing AES-GCM parameters, return plain text fallback if present
  if (!cipher || !iv) {
    if (typeof payload === 'string') return payload;
    if (target.plain) return target.plain;
    return typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
  }

  // SECURITY: legacy keys used by old records are loaded from the environment, never hard-coded.
  // LEGACY_DECRYPTION_KEYS is a JSON array of strings (or a comma-separated list).
  const legacyKeys: string[] = (() => {
    const raw = (process.env.LEGACY_DECRYPTION_KEYS || '').trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    return raw.split(',');
  })();

  const keyCandidatesRaw = [
    process.env.ENCRYPTION_KEY,
    DEFAULT_KEY_STRING,
    process.env.AUTH_SECRET,
    process.env.NEXTAUTH_SECRET,
    process.env.JWT_SECRET,
    ...legacyKeys,
  ].filter(Boolean) as string[];

  const keyStrings: string[] = [];
  for (const k of keyCandidatesRaw) {
    const clean = k.trim().replace(/^["']|["']$/g, '');
    if (clean && !keyStrings.includes(clean)) {
      keyStrings.push(clean);
    }
  }

  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = authTag ? Buffer.from(authTag, 'hex') : null;

  for (const keyStr of keyStrings) {
    const derivedKeys: Buffer[] = [
      crypto.createHash('sha256').update(keyStr).digest(),
      (() => { const b = Buffer.alloc(32); Buffer.from(keyStr).copy(b); return b; })(),
      Buffer.from(crypto.createHash('md5').update(keyStr).digest('hex'), 'utf8'),
      crypto.createHash('sha512').update(keyStr).digest().subarray(0, 32),
      crypto.pbkdf2Sync(keyStr, 'salt', 1000, 32, 'sha256'),
      crypto.pbkdf2Sync(keyStr, '', 100, 32, 'sha256'),
    ];

    if (/^[0-9a-fA-F]{64}$/.test(keyStr)) {
      derivedKeys.unshift(Buffer.from(keyStr, 'hex'));
    }

    for (const key of derivedKeys) {
      // 1. AES-256-GCM
      try {
        const decipher1 = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
        if (authTagBuffer && authTagBuffer.length === 16) {
          decipher1.setAuthTag(authTagBuffer);
        }
        let dec1 = decipher1.update(cipher, 'hex', 'utf8');
        try {
          dec1 += decipher1.final('utf8');
        } catch (e) {
          if (dec1 && /^[\x20-\x7E\s\r\n]+$/.test(dec1)) {
            return dec1;
          }
        }
        if (dec1 && !dec1.includes('\uFFFD')) return dec1;
      } catch (e) {}

      // 2. AES-256-CBC Fallback
      try {
        const cbcIv = ivBuffer.length === 16 ? ivBuffer : Buffer.alloc(16);
        if (ivBuffer.length > 0) ivBuffer.copy(cbcIv);
        const decipherCbc = crypto.createDecipheriv('aes-256-cbc', key, cbcIv);
        let decCbc = decipherCbc.update(cipher, 'hex', 'utf8');
        decCbc += decipherCbc.final('utf8');
        if (decCbc && /^[\x20-\x7E\s\r\n]+$/.test(decCbc)) return decCbc;
      } catch (e) {}

      // 3. AES-128-CBC Fallback
      try {
        const cbcIv = ivBuffer.length === 16 ? ivBuffer : Buffer.alloc(16);
        if (ivBuffer.length > 0) ivBuffer.copy(cbcIv);
        const decipherCbc128 = crypto.createDecipheriv('aes-128-cbc', key.subarray(0, 16), cbcIv);
        let dec128 = decipherCbc128.update(cipher, 'hex', 'utf8');
        dec128 += decipherCbc128.final('utf8');
        if (dec128 && /^[\x20-\x7E\s\r\n]+$/.test(dec128)) return dec128;
      } catch (e) {}
    }
  }

  return typeof payload === 'string' ? payload : JSON.stringify(payload);
}

/**
 * Automatically unwraps and decrypts any embedded cipher JSON object inside a revealed payload string.
 */
export function formatRevealedPayload(text: string): string {
  if (!text) return '';

  let current = text;
  for (let pass = 0; pass < 3; pass++) {
    const jsonRegex = /\{[\s\S]*?"(?:cipher|payloadCipher)"[\s\S]*?\}/g;
    const next = current.replace(jsonRegex, (match) => {
      try {
        const decrypted = decryptPayload(match);
        if (decrypted && !decrypted.includes('"cipher"')) {
          return decrypted;
        }
        return match;
      } catch {
        return match;
      }
    });

    if (next === current) break;
    current = next;
  }

  return current;
}

