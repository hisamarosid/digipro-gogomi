import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { AuditService } from '@/services/audit.service';
import { encryptPayload } from '@/lib/security/encryption';
import { SharedAccountService } from '@/services/sharedAccount.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.INVENTORY_VIEW);
    const { id } = await params;

    const account = await db.sharedAccount.findUnique({
      where: { id },
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
            assignedUser: { select: { id: true, name: true, email: true } },
            order: { select: { id: true, orderNumber: true } },
          },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ success: false, error: 'Shared Account tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: account });
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

    const existing = await db.sharedAccount.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Shared Account tidak ditemukan' }, { status: 404 });
    }

    const updateData: any = {};

    if (body.label !== undefined) updateData.label = body.label;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.acquisitionCost !== undefined) updateData.acquisitionCost = Number(body.acquisitionCost);
    if (body.supplierId !== undefined) updateData.supplierId = body.supplierId || null;
    if (body.supplierReference !== undefined) updateData.supplierReference = body.supplierReference || null;
    if (body.verificationRequired !== undefined) updateData.verificationRequired = Boolean(body.verificationRequired);
    if (body.verificationMethod !== undefined) updateData.verificationMethod = body.verificationMethod;
    if (body.verificationEmail !== undefined) updateData.verificationEmail = body.verificationEmail || null;
    if (body.verificationAccessUrl !== undefined) updateData.verificationAccessUrl = body.verificationAccessUrl || null;
    if (body.verificationMailboxId !== undefined) updateData.verificationMailboxId = body.verificationMailboxId || null;
    if (body.verificationProvider !== undefined) updateData.verificationProvider = body.verificationProvider || null;
    if (body.verificationInstructions !== undefined) updateData.verificationInstructions = body.verificationInstructions || null;
    if (body.masterExpiresAt !== undefined) {
      updateData.masterExpiresAt = body.masterExpiresAt ? new Date(body.masterExpiresAt) : null;
    }
    if (body.credentialPlain && body.credentialPlain.trim()) {
      updateData.credentialEncrypted = JSON.stringify(encryptPayload(body.credentialPlain.trim()));
    }

    if (body.maxSlots !== undefined && Number(body.maxSlots) !== existing.maxSlots) {
      await SharedAccountService.updateCapacity(
        id,
        Number(body.maxSlots),
        session.userId,
        body.newSlots
      );
    }

    const updated = await db.sharedAccount.update({
      where: { id },
      data: updateData,
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
    });

    await AuditService.log({
      actorId: session.userId,
      action: 'UPDATE_SHARED_ACCOUNT',
      entity: 'SharedAccount',
      entityId: id,
      before: JSON.stringify({ label: existing.label, status: existing.status }),
      after: JSON.stringify({ label: updated.label, status: updated.status }),
    });

    return NextResponse.json({
      success: true,
      message: 'Shared Account berhasil diperbarui!',
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

    const account = await db.sharedAccount.findUnique({
      where: { id },
      include: {
        slots: {
          where: { status: 'ASSIGNED' },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ success: false, error: 'Shared Account tidak ditemukan' }, { status: 404 });
    }

    // Safety check: if there are assigned active slots, prevent hard delete or suggest invalidating
    if (account.slots.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Tidak dapat menghapus! Akun ini memiliki ${account.slots.length} slot aktif yang sedang digunakan customer. Gunakan fitur Invalidate & Ganti Otomatis.`,
        },
        { status: 400 }
      );
    }

    await db.sharedAccount.delete({
      where: { id },
    });

    await AuditService.log({
      actorId: session.userId,
      action: 'DELETE_SHARED_ACCOUNT',
      entity: 'SharedAccount',
      entityId: id,
      before: JSON.stringify({ label: account.label, maxSlots: account.maxSlots }),
    });

    return NextResponse.json({
      success: true,
      message: 'Shared Account berhasil dihapus!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
