import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { SharedAccountService } from '@/services/sharedAccount.service';
import { AuditService } from '@/services/audit.service';

export async function GET() {
  try {
    await requireAdmin();
    const accounts = await db.sharedAccount.findMany({
      include: {
        variant: {
          select: { id: true, name: true, sku: true, product: { select: { name: true } } },
        },
        supplier: {
          select: { id: true, name: true, code: true },
        },
        slots: {
          orderBy: { slotNumber: 'asc' },
          include: {
            assignedUser: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: accounts,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();

    const {
      productVariantId,
      label,
      credentialPlain,
      maxSlots,
      slotLabelPrefix,
      masterExpiresAt,
      deliveryDeadlineAt,
      verificationRequired,
      verificationMethod,
      verificationEmail,
      verificationAccessUrl,
      verificationMailboxId,
      verificationProvider,
      verificationInstructions,
    } = body;

    if (!productVariantId || !label || !credentialPlain) {
      return NextResponse.json(
        { success: false, error: 'ProductVariantId, label, dan credentialPlain wajib diisi' },
        { status: 400 }
      );
    }

    const createdAccount = await SharedAccountService.createSharedAccount(
      {
        productVariantId,
        label,
        credentialPlain,
        maxSlots: maxSlots ? Number(maxSlots) : undefined,
        slotLabelPrefix,
        masterExpiresAt: masterExpiresAt ? new Date(masterExpiresAt) : null,
        deliveryDeadlineAt: deliveryDeadlineAt ? new Date(deliveryDeadlineAt) : null,
        acquisitionCost: body.acquisitionCost ? Number(body.acquisitionCost) : 0,
        supplierId: body.supplierId || null,
        supplierReference: body.supplierReference || null,
        verificationRequired: Boolean(verificationRequired),
        verificationMethod,
        verificationEmail,
        verificationAccessUrl,
        verificationMailboxId,
        verificationProvider,
        verificationInstructions,
        slots: body.slots,
      },
      session.userId
    );

    return NextResponse.json({
      success: true,
      message: 'Shared Account & Slot berhasil dibuat!',
      data: createdAccount,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
