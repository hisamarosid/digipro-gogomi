import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/security/cron-auth';
import { SubscriptionReminderService } from '@/services/subscriptionReminder.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const unauthorized = verifyCronRequest(req);
        if (unauthorized) return unauthorized;

        const result = await SubscriptionReminderService.sendDueReminders();
        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            result,
        });
    } catch (error: any) {
        console.error('[Internal Cron Subscription Reminders Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
