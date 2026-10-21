import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment.service';

export async function POST(req: NextRequest) {
  try {
    // 1. Read Raw HTTP Request Body text BEFORE JSON parsing
    const rawBody = await req.text();
    let payloadJson: any = {};
    try {
      payloadJson = JSON.parse(rawBody);
    } catch {}

    const signature = req.headers.get('x-signature') ||
                      req.headers.get('X-Signature') ||
                      req.headers.get('x-autogopay-signature') ||
                      req.headers.get('x-hub-signature-256') ||
                      payloadJson.signature ||
                      payloadJson.sign ||
                      null;

    // 2. Delegate to PaymentService for HMAC verification, amount checking & idempotent fulfillment
    const result = await PaymentService.processWebhook(rawBody, signature);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.code || 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: result.message },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[AutoGoPay Webhook API Error]:', err);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
