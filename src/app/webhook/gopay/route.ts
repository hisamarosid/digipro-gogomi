import { NextRequest } from 'next/server';
import { POST as handleAutoGoPayWebhook } from '@/app/api/webhooks/autogopay/route';

export async function POST(req: NextRequest) {
  return handleAutoGoPayWebhook(req);
}
