import { NextRequest, NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/security/cron-auth';
import { InventoryReconciliationService } from '@/services/reconciliation.service';

export async function POST(req: NextRequest) {
    try {
        const unauthorized = verifyCronRequest(req);
        if (unauthorized) return unauthorized;

        const report = await InventoryReconciliationService.reconcileSystemInventory();
        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            report,
        });
    } catch (error: any) {
        console.error('[Internal Cron Health Reconcile Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
