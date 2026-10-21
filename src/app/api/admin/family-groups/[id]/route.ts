import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { AuditService } from '@/services/audit.service';
import { encryptPayload } from '@/lib/security/encryption';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.INVENTORY_VIEW);
    const { id } = await params;

    const group = await db.familyGroup.findUnique({
      where: { id },
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
            user: { select: { id: true, name: true, email: true } },
            order: { select: { id: true, orderNumber: true } },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ success: false, error: 'Family Group tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: group });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(PERMISSIONS.INVENTORY_UPDATE);
    const { id } = await params;
    const body = await req.json();

    const existing = await db.familyGroup.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Family Group tidak ditemukan' }, { status: 404 });
    }

    const updateData: any = {};

    if (body.groupReference !== undefined) updateData.groupReference = body.groupReference;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.acquisitionCost !== undefined) updateData.acquisitionCost = Number(body.acquisitionCost);
    if (body.supplierId !== undefined) updateData.supplierId = body.supplierId || null;
    if (body.supplierReference !== undefined) updateData.supplierReference = body.supplierReference || null;
    if (body.masterExpiresAt !== undefined) {
      updateData.masterExpiresAt = body.masterExpiresAt ? new Date(body.masterExpiresAt) : null;
    }
    if (body.ownerCredentialPlain && body.ownerCredentialPlain.trim()) {
      updateData.ownerCredentialEncrypted = JSON.stringify(encryptPayload(body.ownerCredentialPlain.trim()));
    }
    if (body.verificationRequired !== undefined) updateData.verificationRequired = Boolean(body.verificationRequired);
    if (body.verificationMethod !== undefined) updateData.verificationMethod = body.verificationMethod;
    if (body.verificationEmail !== undefined) updateData.verificationEmail = body.verificationEmail || null;
    if (body.verificationAccessUrl !== undefined) updateData.verificationAccessUrl = body.verificationAccessUrl || null;
    if (body.verificationMailboxId !== undefined) updateData.verificationMailboxId = body.verificationMailboxId || null;
    if (body.verificationProvider !== undefined) updateData.verificationProvider = body.verificationProvider || null;
    if (body.verificationInstructions !== undefined) updateData.verificationInstructions = body.verificationInstructions || null;

    const updated = await db.familyGroup.update({
      where: { id },
      data: updateData,
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
    });

    await AuditService.log({
      actorId: session.userId,
      action: 'UPDATE_FAMILY_GROUP',
      entity: 'FamilyGroup',
      entityId: id,
      before: JSON.stringify({ groupReference: existing.groupReference, status: existing.status }),
      after: JSON.stringify({ groupReference: updated.groupReference, status: updated.status }),
    });

    return NextResponse.json({
      success: true,
      message: 'Family Group berhasil diperbarui!',
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(PERMISSIONS.INVENTORY_UPDATE);
    const { id } = await params;

    const group = await db.familyGroup.findUnique({
      where: { id },
      include: {
        members: {
          where: { status: 'ASSIGNED' },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ success: false, error: 'Family Group tidak ditemukan' }, { status: 404 });
    }

    if (group.members.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Tidak dapat menghapus! Grup ini memiliki ${group.members.length} member aktif yang sedang terdaftar.`,
        },
        { status: 400 }
      );
    }

    await db.familyGroup.delete({
      where: { id },
    });

    await AuditService.log({
      actorId: session.userId,
      action: 'DELETE_FAMILY_GROUP',
      entity: 'FamilyGroup',
      entityId: id,
      before: JSON.stringify({ groupReference: group.groupReference, maxMembers: group.maxMembers }),
    });

    return NextResponse.json({
      success: true,
      message: 'Family Group berhasil dihapus!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
