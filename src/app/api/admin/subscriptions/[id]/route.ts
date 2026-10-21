import { NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';
import { AuditService } from '@/services/audit.service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { extendDays, status } = body;

    const subscription = await db.subscription.findUnique({
      where: { id },
      include: { user: true, variant: true },
    });

    if (!subscription) {
      return NextResponse.json({ success: false, error: 'Subscription tidak ditemukan' }, { status: 404 });
    }

    let newExpiresAt = subscription.expiresAt;
    let newRenewalCount = subscription.renewalCount;
    let newStatus = subscription.status;

    if (extendDays && Number(extendDays) > 0) {
      const baseTime = subscription.expiresAt > new Date() ? subscription.expiresAt.getTime() : Date.now();
      newExpiresAt = new Date(baseTime + Number(extendDays) * 24 * 3600 * 1000);
      newRenewalCount += 1;
      newStatus = 'ACTIVE';
    }

    if (status) {
      newStatus = status;
    }

    const updated = await db.subscription.update({
      where: { id },
      data: {
        expiresAt: newExpiresAt,
        renewalCount: newRenewalCount,
        status: newStatus,
      },
    });

    await AuditService.log({
      actorId: session.userId,
      action: 'ADMIN_UPDATE_SUBSCRIPTION',
      entity: 'Subscription',
      entityId: id,
      after: { extendDays, status: newStatus, expiresAt: newExpiresAt },
    });

    return NextResponse.json({
      success: true,
      message: 'Langganan berhasil diperbarui!',
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
