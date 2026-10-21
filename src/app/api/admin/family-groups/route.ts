import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { FamilyGroupService } from '@/services/familyGroup.service';
import { AuditService } from '@/services/audit.service';

export async function GET() {
  try {
    await requireAdmin();
    const groups = await db.familyGroup.findMany({
      include: {
        variant: {
          select: { id: true, name: true, sku: true, product: { select: { name: true } } },
        },
        supplier: {
          select: { id: true, name: true, code: true },
        },
        members: {
          orderBy: { slotNumber: 'asc' },
          include: {
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: groups,
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
      groupReference,
      ownerCredentialPlain,
      maxMembers,
      masterExpiresAt,
      supplierId,
      acquisitionCost,
      supplierReference,
      purchasedAt,
      verificationRequired,
      verificationMethod,
      verificationEmail,
      verificationAccessUrl,
      verificationMailboxId,
      verificationProvider,
      verificationInstructions,
    } = body;

    if (!productVariantId || !groupReference) {
      return NextResponse.json(
        { success: false, error: 'ProductVariantId dan groupReference wajib diisi' },
        { status: 400 }
      );
    }

    const createdGroup = await FamilyGroupService.createFamilyGroup({
      productVariantId,
      groupReference,
      ownerCredentialPlain,
      maxMembers: maxMembers ? Number(maxMembers) : undefined,
      masterExpiresAt: masterExpiresAt ? new Date(masterExpiresAt) : null,
      supplierId: supplierId || null,
      acquisitionCost: acquisitionCost ? Number(acquisitionCost) : 0,
      supplierReference: supplierReference || null,
      purchasedAt: purchasedAt ? new Date(purchasedAt) : null,
      verificationRequired: Boolean(verificationRequired),
      verificationMethod: verificationMethod || 'NONE',
      verificationEmail: verificationEmail || null,
      verificationAccessUrl: verificationAccessUrl || null,
      verificationMailboxId: verificationMailboxId || null,
      verificationProvider: verificationProvider || null,
      verificationInstructions: verificationInstructions || null,
    });

    await AuditService.log({
      actorId: session.userId,
      action: 'CREATE_FAMILY_GROUP',
      entity: 'FamilyGroup',
      entityId: createdGroup?.id,
      after: JSON.stringify({ groupReference, maxMembers: createdGroup?.maxMembers }),
    });

    return NextResponse.json({
      success: true,
      message: 'Family Group & Member Slots berhasil dibuat!',
      data: createdGroup,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
