import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { FulfillmentService } from '@/services/fulfillment.service';
import { NotificationOrchestrator } from '@/services/email/email-orchestrator';
import { OrderStatus, PaymentStatus, CustomerNotificationCategory } from '../../../../../generated/prisma';

export async function POST(req: NextRequest) {
    // SECURITY: payment simulator marks orders PAID without any real payment.
    // Disabled in production unless explicitly enabled, and always restricted to SUPER_ADMIN.
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_PAYMENT_SIMULATOR !== 'true') {
        return NextResponse.json(
            { success: false, error: 'Simulasi pembayaran dinonaktifkan di production.' },
            { status: 404 }
        );
    }

    try {
        await requireSuperAdmin();
    } catch {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const body = await req.json();
        const { orderNumber } = body;

        if (!orderNumber) {
            return NextResponse.json(
                { success: false, error: 'Nomor pesanan (orderNumber) wajib diisi' },
                { status: 400 }
            );
        }

        // Find Order
        const order = await db.order.findUnique({
            where: { orderNumber },
            include: { payments: { orderBy: { createdAt: 'desc' } } },
        });

        if (!order) {
            return NextResponse.json(
                { success: false, error: 'Pesanan tidak ditemukan' },
                { status: 404 }
            );
        }

        // Update payment status
        if (order.payments.length > 0) {
            await db.payment.update({
                where: { id: order.payments[0].id },
                data: { status: PaymentStatus.PAID },
            });
        }

        // Update order status to PAID
        await db.order.update({
            where: { id: order.id },
            data: {
                status: OrderStatus.PAID,
                paymentStatus: PaymentStatus.PAID,
            },
        });

        // Execute digital inventory fulfillment (assign credentials/keys)
        const fulfillmentResult = await FulfillmentService.fulfillOrder(order.id);

        // Dispatch PAYMENT_SUCCESS Domain Event via NotificationOrchestrator
        const fullOrder = await db.order.findUnique({
            where: { id: order.id },
            include: { user: true },
        });

        const targetEmail = fullOrder?.user?.email || fullOrder?.guestEmail;
        if (targetEmail) {
            try {
                await NotificationOrchestrator.dispatchEvent({
                    userId: fullOrder?.userId || null,
                    userEmail: targetEmail,
                    eventType: 'PAYMENT_SUCCESS',
                    title: `Pembayaran Berhasil — Order #${order.orderNumber}`,
                    message: `Pembayaran sebesar Rp${order.grandTotal.toLocaleString('id-ID')} untuk Order #${order.orderNumber} telah diterima.`,
                    actionUrl: `/account/orders`,
                    emailTemplateKey: 'PAYMENT_SUCCESS',
                    emailCategory: 'TRANSACTIONAL',
                    metadata: {
                        customerName: fullOrder?.user?.name || fullOrder?.guestName || 'Customer',
                        orderNumber: order.orderNumber,
                        amount: order.grandTotal,
                        paymentMethod: 'QRIS (AutoGoPay)',
                        category: CustomerNotificationCategory.PAYMENT,
                    },
                    dedupeKey: `PAYMENT:${order.id}`,
                });
            } catch (err: any) {
                console.error('[SimulatePayment] Notification Event Error:', err?.message);
            }
        }

        // Also trigger DomainEventService for Admin Notifications
        const { DomainEventService } = await import('@/services/domainEvent.service');
        await DomainEventService.publish({
            eventName: 'PAYMENT_SETTLED',
            userId: fullOrder?.userId || null,
            orderId: order.id,
            orderNumber: order.orderNumber,
        });

        return NextResponse.json({
            success: true,
            message: 'Simulasi pembayaran sukses berhasil!',
            orderNumber: order.orderNumber,
            orderId: order.id,
            fulfillment: fulfillmentResult,
        });
    } catch (err: any) {
        console.error('[DEV SIMULATE PAYMENT ERROR]:', err);
        return NextResponse.json(
            { success: false, error: err.message || 'Gagal mensimulasikan pembayaran' },
            { status: 500 }
        );
    }
}
