import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { getCurrentSession } from '@/lib/auth/session';
import { InventoryHealthService } from '@/services/inventoryHealth.service';
import { AuditService } from '@/services/audit.service';
import { SharedAccountStatus } from '../../../../../../generated/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role === 'CUSTOMER') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const summary = await InventoryHealthService.getInventoryHealthSummary();

    // Fetch detailed shared accounts health list
    const sharedAccounts = await db.sharedAccount.findMany({
      include: {
        variant: { select: { id: true, name: true, sku: true, product: { select: { name: true } } } },
        slots: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const accountsHealthList = await Promise.all(
      sharedAccounts.map(async (acc) => {
        const health = await InventoryHealthService.evaluateSharedAccountHealth(acc);
        return {
          id: acc.id,
          label: acc.label,
          variantName: acc.variant?.name,
          productName: acc.variant?.product?.name,
          status: acc.status,
          health: health.status,
          score: health.score,
          reasonCode: health.reasonCode,
          reasonMessage: health.reasonMessage,
          masterExpiresAt: acc.masterExpiresAt,
          maxSlots: acc.maxSlots,
          availableSlots: acc.slots.filter((s) => s.status === 'AVAILABLE').length,
          assignedSlots: acc.slots.filter((s) => s.status === 'ASSIGNED').length,
        };
      })
    );

    return NextResponse.json({
      success: true,
      summary,
      accountsHealthList,
    });
  } catch (error: any) {
    console.error('[Admin Operations Inventory Health API Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN_ROLE' }, { status: 403 });
    }

    const body = await req.json();
    const { resourceType, resourceId, newStatus, reason } = body;

    if (!resourceType || !resourceId || !newStatus || !reason) {
      return NextResponse.json({ success: false, error: 'MISSING_REQUIRED_FIELDS' }, { status: 400 });
    }

    if (resourceType === 'SHARED_ACCOUNT') {
      const existing = await db.sharedAccount.findUnique({ where: { id: resourceId } });
      if (!existing) {
        return NextResponse.json({ success: false, error: 'RESOURCE_NOT_FOUND' }, { status: 404 });
      }

      await db.sharedAccount.update({
        where: { id: resourceId },
        data: { status: newStatus as SharedAccountStatus },
      });

      await AuditService.log({
        actorId: session.userId || 'system',
        action: 'INVENTORY_HEALTH_OVERRIDE',
        entity: 'SharedAccount',
        entityId: resourceId,
        before: { status: existing.status },
        after: { status: newStatus, reason },
      });

      return NextResponse.json({ success: true, message: `Status SharedAccount diubah menjadi ${newStatus}` });
    }

    return NextResponse.json({ success: false, error: 'UNSUPPORTED_RESOURCE_TYPE' }, { status: 400 });
  } catch (error: any) {
    console.error('[Admin Operations Health Override Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
