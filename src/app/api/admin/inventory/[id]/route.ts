import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';
import { AuditService } from '@/services/audit.service';
import { SupplierClaimRecommendationService } from '@/services/supplier-warranty/supplier-claim-recommendation.service';
import { StockStatus } from '@/../generated/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const existing = await db.inventoryItem.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        costAmount: true,
        supplierId: true,
        supplierReference: true,
        variantId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Inventory item tidak ditemukan' }, { status: 404 });
    }

    const {
      status,
      costAmount,
      supplierId,
      supplierReference,
      verificationRequired,
      verificationMethod,
      verificationEmail,
      verificationAccessUrl,
      verificationMailboxId,
      verificationProvider,
      verificationInstructions,
    } = body;

    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status as StockStatus;
    if (costAmount !== undefined) dataToUpdate.costAmount = Number(costAmount);
    if (supplierId !== undefined) dataToUpdate.supplierId = supplierId || null;
    if (supplierReference !== undefined) dataToUpdate.supplierReference = supplierReference || null;
    if (verificationRequired !== undefined) dataToUpdate.verificationRequired = Boolean(verificationRequired);
    if (verificationMethod !== undefined) dataToUpdate.verificationMethod = verificationMethod;
    if (verificationEmail !== undefined) dataToUpdate.verificationEmail = verificationEmail || null;
    if (verificationAccessUrl !== undefined) dataToUpdate.verificationAccessUrl = verificationAccessUrl || null;
    if (verificationMailboxId !== undefined) dataToUpdate.verificationMailboxId = verificationMailboxId || null;
    if (verificationProvider !== undefined) dataToUpdate.verificationProvider = verificationProvider || null;
    if (verificationInstructions !== undefined) dataToUpdate.verificationInstructions = verificationInstructions || null;

    const updated = await db.inventoryItem.update({
      where: { id },
      data: dataToUpdate,
    });

    // If marked INVALID, auto-trigger supplier claim recommendation
    if (status === 'INVALID') {
      SupplierClaimRecommendationService.evaluateAndRecommendClaim({
        inventoryId: id,
        failureReason: 'ACCOUNT_DISABLED',
        description: 'Auto-generated from inventory item marked INVALID by admin',
      }).catch((err) => console.error('[SupplierClaimRecommendation Error]:', err));
    }

    // Detect specific audit action
    let action = 'INVENTORY_UPDATED';
    if (supplierId !== undefined && supplierId !== existing.supplierId) {
      action = 'INVENTORY_SUPPLIER_CHANGED';
    } else if (costAmount !== undefined && costAmount !== existing.costAmount) {
      action = 'INVENTORY_COST_CHANGED';
    } else if (status === 'INVALID' && existing.status !== 'INVALID') {
      action = 'INVENTORY_INVALIDATED';
    }

    await AuditService.log({
      actorId: session.userId,
      action,
      entity: 'InventoryItem',
      entityId: id,
      before: {
        status: existing.status,
        costAmount: existing.costAmount,
        supplierId: existing.supplierId,
        supplierReference: existing.supplierReference,
      },
      after: {
        status: updated.status,
        costAmount: updated.costAmount,
        supplierId: updated.supplierId,
        supplierReference: updated.supplierReference,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
