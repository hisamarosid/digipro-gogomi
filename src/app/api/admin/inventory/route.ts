import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { InventoryService } from '@/services/inventory.service';
import { ReplacementService } from '@/services/replacement/replacement-service';
import { AuditService } from '@/services/audit.service';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const {
      variantId,
      payloads,
      deliveryType,
      deliveryValidityHoursOverride,
      customExpiresAt,
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

    if (!variantId || !payloads || !Array.isArray(payloads) || payloads.length === 0) {
      return NextResponse.json({ success: false, error: 'Variant ID dan payload wajib diisi' }, { status: 400 });
    }

    const parsedExpiresAt = customExpiresAt ? new Date(customExpiresAt) : null;
    const parsedCost = costAmount != null ? Number(costAmount) : null;

    const result = await InventoryService.addStock(
      variantId,
      payloads,
      deliveryType || 'LICENSE_KEY',
      deliveryValidityHoursOverride ? Number(deliveryValidityHoursOverride) : null,
      parsedExpiresAt,
      parsedCost,
      supplierId || null,
      supplierReference || null,
      {
        verificationRequired,
        verificationMethod,
        verificationEmail,
        verificationAccessUrl,
        verificationMailboxId,
        verificationProvider,
        verificationInstructions,
      }
    );

    // Auto-process any WAITING_STOCK replacement requests for this variant
    ReplacementService.processWaitingQueue(session.userId).catch((err) =>
      console.error('[Auto Replacement Process Waiting Queue Error]:', err)
    );

    // Record audit log without credential payload
    await AuditService.log({
      actorId: session.userId,
      action: 'INVENTORY_CREATED',
      entity: 'InventoryItem',
      entityId: variantId,
      after: {
        countAdded: result.count,
        deliveryType,
        supplierId: supplierId || null,
        supplierReference: supplierReference || null,
        costAmount: parsedCost,
        expiresAt: parsedExpiresAt,
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
