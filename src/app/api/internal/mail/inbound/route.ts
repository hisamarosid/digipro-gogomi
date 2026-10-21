import { NextRequest, NextResponse } from 'next/server';
import { VerificationAccessService } from '@/services/verification/verification-access.service';

export const dynamic = 'force-dynamic';

function extractEmailString(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const match = val.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0].toLowerCase() : val.trim().toLowerCase();
  }
  if (Array.isArray(val) && val.length > 0) {
    return extractEmailString(val[0]);
  }
  if (typeof val === 'object') {
    return extractEmailString(val.address || val.email || val.value || val.to || val.from);
  }
  return '';
}

function cleanHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const secretQuery = new URL(req.url).searchParams.get('secret');

    let secret = secretQuery;
    if (!secret && authHeader.startsWith('Bearer ')) {
      secret = authHeader.replace('Bearer ', '').trim();
    }

    const body = await req.json();

    const recipientEmail =
      extractEmailString(body.to) ||
      extractEmailString(body.recipient) ||
      extractEmailString(body.recipientEmail) ||
      extractEmailString(body.to_email) ||
      extractEmailString(body.envelope?.to) ||
      extractEmailString(body.email);

    const senderEmail =
      extractEmailString(body.from) ||
      extractEmailString(body.sender) ||
      extractEmailString(body.senderEmail) ||
      extractEmailString(body.from_email) ||
      extractEmailString(body.envelope?.from) ||
      (typeof body.from === 'string' ? body.from : '');

    const subject = body.subject || body.title || '';
    const textContent = typeof body.text === 'string' && body.text.trim() ? body.text : '';
    const htmlContent = typeof body.html === 'string' ? cleanHtml(body.html) : '';
    const rawBody = textContent
      ? `${textContent}\n${htmlContent}`
      : htmlContent || body.bodyText || body.content || body.message || subject || '';

    if (!recipientEmail) {
      return NextResponse.json({ success: false, error: 'Recipient email is required' }, { status: 400 });
    }

    const result = await VerificationAccessService.processInboundMailWebhook({
      secret: secret || undefined,
      recipientEmail,
      senderEmail,
      subject,
      bodyText: rawBody,
      messageId: body.messageId || body.id || undefined,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === 'INVALID_WEBHOOK_SECRET') {
      return NextResponse.json({ success: false, error: 'Invalid webhook secret' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: err?.message || 'Webhook processing failed' }, { status: 500 });
  }
}
