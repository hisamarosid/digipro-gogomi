import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/security/cron-auth';
import { FulfillmentQueueService } from '@/services/queue.service';
import { EmailQueueService } from '@/services/email/email-queue.service';

export async function POST(req: NextRequest) {
    try {
        const unauthorized = verifyCronRequest(req);
        if (unauthorized) return unauthorized;

        const batchResult = await FulfillmentQueueService.processQueueBatch(15);

        // Emails are only attempted when a new one is enqueued, so queued/retrying jobs
        // (backoff 1m, 5m, 15m, 1h, 6h) would otherwise sit there until the next email arrives.
        let emailsSent = 0;
        try {
            emailsSent = await EmailQueueService.processEmailQueue(25);
        } catch (emailError: any) {
            console.error('[Internal Cron Process Queue] email queue error:', emailError?.message);
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            batchResult,
            emailsSent,
        });
    } catch (error: any) {
        console.error('[Internal Cron Process Queue Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
