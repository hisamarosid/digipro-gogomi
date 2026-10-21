import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/security/cron-auth';
import { ReservationService } from '@/services/reservation.service';

export async function POST(req: NextRequest) {
    try {
        const unauthorized = verifyCronRequest(req);
        if (unauthorized) return unauthorized;

        const result = await ReservationService.releaseExpiredReservations();
        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            result,
        });
    } catch (error: any) {
        console.error('[Internal Cron Release Reservations Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
