import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { InventoryService } from '@/services/inventory.service';
import { AuditService } from '@/services/audit.service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(PERMISSIONS.INVENTORY_VIEW_SENSITIVE);
    const { id } = await params;

    const item = await db.inventoryItem.findUnique({
      where: { id },
      include: {
        variant: {
          select: {
            sku: true,
            name: true,
            product: { select: { name: true } },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: 'Item inventaris tidak ditemukan' }, { status: 404 });
    }

    // Decrypt on server
    const plainPayload = InventoryService.getPlainPayload({
      payloadCipher: item.payloadCipher,
      payloadIv: item.payloadIv,
      payloadAuthTag: item.payloadAuthTag,
    });

    // Record Audit Log (DO NOT store plaintext payload in audit log!)
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    await AuditService.log({
      actorId: session.userId,
      action: 'CREDENTIAL_REVEALED',
      entity: 'INVENTORY_ITEM',
      entityId: item.id,
      after: {
        productName: item.variant?.product?.name,
        variantSku: item.variant?.sku,
        type: item.type,
        status: item.status,
      },
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: item.id,
        plainPayload,
        productName: item.variant?.product?.name,
        variantSku: item.variant?.sku,
        type: item.type,
        revealedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json(
        { success: false, error: 'Akses Ditolak: Anda memerlukan izin "inventory:view-sensitive" untuk mengungkap kredensial ini.' },
        { status: 403 }
      );
    }
    console.error('[Inventory Reveal API Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
