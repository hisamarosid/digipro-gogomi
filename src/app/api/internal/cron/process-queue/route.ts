import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/security/cron-auth';
import { FulfillmentQueueService } from '@/services/queue.service';

export async function POST(req: NextRequest) {
    try {
        const unauthorized = verifyCronRequest(req);
        if (unauthorized) return unauthorized;

        const batchResult = await FulfillmentQueueService.processQueueBatch(15);
        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            batchResult,
        });
    } catch (error: any) {
        console.error('[Internal Cron Process Queue Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
