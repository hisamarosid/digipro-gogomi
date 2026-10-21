/**
 * Deterministic, Context-Aware Code Parser Service for Verification Emails
 * Supports Netflix 4-digit codes, Adobe 6-digit codes, Canva, Spotify, ChatGPT, and Generic Fallback.
 * Zero external LLM requirement — fast, predictable, and privacy-focused.
 */

export interface ParsedCodeResult {
  code: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  provider: string;
  codeLength: number;
  expiresAt: Date;
  reason?: string;
}

export class ProviderParserService {
  /**
   * Parses an inbound email body & subject to extract verification/OTP code
   */
  static parseInboundEmail(
    sender: string,
    subject: string,
    body: string,
    providerName: string = 'GENERIC'
  ): ParsedCodeResult {
    const cleanSender = (sender || '').toLowerCase().trim();
    const cleanSubject = (subject || '').trim();
    const cleanBody = (body || '').trim();
    const combinedText = `${cleanSender} ${cleanSubject} ${cleanBody}`.toLowerCase();
    const normalizedProvider = (providerName || 'GENERIC').toUpperCase();

    const now = new Date();
    // Default TTL: 15 minutes
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    // 1. Netflix Provider Specific Rules (Supports 4-digit & 6-digit codes)
    if (normalizedProvider === 'NETFLIX' || combinedText.includes('netflix')) {
      const netflixResult = this.parseNetflixCode(cleanSubject, cleanBody, expiresAt);
      if (netflixResult.code) return netflixResult;
    }

    // 2. ChatGPT / OpenAI Provider Specific Rules
    if (normalizedProvider === 'CHATGPT' || combinedText.includes('chatgpt') || combinedText.includes('openai')) {
      const chatgptResult = this.parseStandardNumericCode(cleanSubject, cleanBody, 6, 'CHATGPT', expiresAt);
      if (chatgptResult.code) return chatgptResult;
    }

    // 3. Adobe Provider Specific Rules (6-digit numeric)
    if (normalizedProvider === 'ADOBE' || combinedText.includes('adobe')) {
      const adobeResult = this.parseStandardNumericCode(cleanSubject, cleanBody, 6, 'ADOBE', expiresAt);
      if (adobeResult.code) return adobeResult;
    }

    // 4. Canva Provider Specific Rules
    if (normalizedProvider === 'CANVA' || combinedText.includes('canva')) {
      const canvaResult = this.parseStandardNumericCode(cleanSubject, cleanBody, 6, 'CANVA', expiresAt);
      if (canvaResult.code) return canvaResult;
    }

    // 5. Spotify / Claude Rules
    if (combinedText.includes('spotify') || combinedText.includes('anthropic') || combinedText.includes('claude')) {
      const providerKey = combinedText.includes('spotify') ? 'SPOTIFY' : 'CLAUDE';
      const result = this.parseStandardNumericCode(cleanSubject, cleanBody, 6, providerKey, expiresAt);
      if (result.code) return result;
    }

    // 6. Generic Context-Aware Parser Fallback
    return this.parseGenericContextCode(cleanSubject, cleanBody, expiresAt);
  }

  /**
   * Netflix Specific Code Extraction (Handles "Netflix: your sign-in code" & 4-digit codes)
   */
  private static parseNetflixCode(
    subject: string,
    body: string,
    expiresAt: Date
  ): ParsedCodeResult {
    const fullText = `${subject}\n${body}`;

    // Context keywords for Netflix
    const keywords = [
      'sign-in code',
      'kode masuk',
      'verification code',
      'enter this code',
      'your code is',
      'kode verifikasi',
    ];

    const hasKeyword = keywords.some((kw) => fullText.toLowerCase().includes(kw));

    // Look for 4-digit or 6-digit standalone numbers near keywords
    const fourDigitMatch = fullText.match(/(?:code|masuk|sign-in|verifikasi|is|:\s*)\D*(\d{4})\b/i) ||
                           fullText.match(/\b(\d{4})\b/);

    if (fourDigitMatch && fourDigitMatch[1]) {
      const candidate = fourDigitMatch[1];
      if (candidate !== '2026' && candidate !== '2025' && candidate !== '2024') {
        return {
          code: candidate,
          confidence: hasKeyword ? 'HIGH' : 'MEDIUM',
          provider: 'NETFLIX',
          codeLength: 4,
          expiresAt,
        };
      }
    }

    // Secondary check: 6-digit match
    const sixDigitMatch = fullText.match(/\b(\d{6})\b/);
    if (sixDigitMatch && sixDigitMatch[1]) {
      return {
        code: sixDigitMatch[1],
        confidence: hasKeyword ? 'HIGH' : 'MEDIUM',
        provider: 'NETFLIX',
        codeLength: 6,
        expiresAt,
      };
    }

    return {
      code: null,
      confidence: 'LOW',
      provider: 'NETFLIX',
      codeLength: 0,
      expiresAt,
      reason: 'No 4-digit or 6-digit Netflix sign-in code pattern found',
    };
  }

  /**
   * Standard Numeric Code Parser for 6-digit codes
   */
  private static parseStandardNumericCode(
    subject: string,
    body: string,
    targetLength: number,
    provider: string,
    expiresAt: Date
  ): ParsedCodeResult {
    const fullText = `${subject}\n${body}`;

    // 1. Proximity Match: Extract candidate directly following verification keywords
    const proximityRegex = new RegExp(
      `(?:kode verifikasi|verification code|kode anda|your code is|code is|verifikasi|otp|pin|masuk|sign-in|temporary code|kode)\\D*?(\\d{${targetLength}})\\b`,
      'i'
    );
    const proximityMatch = fullText.match(proximityRegex);
    if (proximityMatch && proximityMatch[1]) {
      const candidate = proximityMatch[1];
      if (!candidate.startsWith('19') && !candidate.startsWith('20')) {
        return {
          code: candidate,
          confidence: 'HIGH',
          provider,
          codeLength: targetLength,
          expiresAt,
        };
      }
    }

    const regex = new RegExp(`\\b(\\d{${targetLength}})\\b`, 'g');
    const matches = Array.from(fullText.matchAll(regex));

    if (matches.length > 0) {
      const keywords = ['code', 'kode', 'verification', 'security', 'otp', 'pin', 'login', 'temporary', 'verification code'];
      const hasKeyword = keywords.some((kw) => fullText.toLowerCase().includes(kw));

      for (const m of matches) {
        const candidate = m[1];
        if (!candidate.startsWith('19') && !candidate.startsWith('20')) {
          return {
            code: candidate,
            confidence: hasKeyword ? 'HIGH' : 'MEDIUM',
            provider,
            codeLength: targetLength,
            expiresAt,
          };
        }
      }

      return {
        code: matches[0][1],
        confidence: 'MEDIUM',
        provider,
        codeLength: targetLength,
        expiresAt,
      };
    }

    return {
      code: null,
      confidence: 'LOW',
      provider,
      codeLength: 0,
      expiresAt,
      reason: `No ${targetLength}-digit numeric code found`,
    };
  }

  /**
   * Generic Context-Aware Code Parser
   */
  private static parseGenericContextCode(
    subject: string,
    body: string,
    expiresAt: Date
  ): ParsedCodeResult {
    const fullText = `${subject}\n${body}`;
    const lower = fullText.toLowerCase();

    const keywords = [
      'verification code',
      'kode verifikasi',
      'sign-in code',
      'security code',
      'login code',
      'one-time code',
      'otp',
      'your code is',
      'kode anda',
      'temporary code',
    ];

    const matchedKeyword = keywords.find((kw) => lower.includes(kw));

    if (matchedKeyword) {
      const kwIdx = lower.indexOf(matchedKeyword);
      const snippet = fullText.substring(Math.max(0, kwIdx - 30), Math.min(fullText.length, kwIdx + 120));

      const codeMatch = snippet.match(/\b([A-Z0-9]{4,8})\b/i);
      if (codeMatch && codeMatch[1]) {
        const code = codeMatch[1].toUpperCase();
        if (!['CODE', 'VERIFY', 'LOGIN', 'PLEASE', 'SECRET', '2026', '2025'].includes(code)) {
          return {
            code,
            confidence: 'HIGH',
            provider: 'GENERIC',
            codeLength: code.length,
            expiresAt,
          };
        }
      }
    }

    const genericSix = fullText.match(/\b(\d{6})\b/);
    if (genericSix && genericSix[1]) {
      return {
        code: genericSix[1],
        confidence: 'MEDIUM',
        provider: 'GENERIC',
        codeLength: 6,
        expiresAt,
      };
    }

    return {
      code: null,
      confidence: 'LOW',
      provider: 'GENERIC',
      codeLength: 0,
      expiresAt,
      reason: 'Could not extract high-confidence verification code from email context',
    };
  }
}
