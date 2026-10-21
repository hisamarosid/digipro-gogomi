import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;

    const result = await PaymentService.checkAndSyncStatus(orderNumber);

    return NextResponse.json({
      success: true,
      status: result.status,
      order: result.order
        ? {
            orderNumber: result.order.orderNumber,
            status: result.order.status,
            paymentStatus: result.order.paymentStatus,
            grandTotal: result.order.grandTotal,
          }
        : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
