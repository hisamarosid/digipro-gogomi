import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Verifies the caller of an internal cron endpoint.
 * Requires CRON_SECRET to be configured (min 32 chars); there is intentionally no fallback value.
 * Accepts `Authorization: Bearer <secret>` or `x-cron-secret: <secret>`.
 * Returns a NextResponse to send back when the request is not authorized, otherwise null.
 */
export function verifyCronRequest(req: NextRequest): NextResponse | null {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret || secret.length < 32) {
    console.error('[Cron] CRON_SECRET is not configured (min 32 chars). Internal cron endpoints are disabled.');
    return NextResponse.json({ success: false, error: 'CRON_NOT_CONFIGURED' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization') || '';
  const provided = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : (req.headers.get('x-cron-secret') || '').trim();

  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(secret).digest();
  if (!provided || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ success: false, error: 'UNAUTHORIZED_CRON_SECRET' }, { status: 401 });
  }
  return null;
}
