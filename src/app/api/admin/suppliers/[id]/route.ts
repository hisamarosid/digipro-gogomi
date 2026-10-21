import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { getCurrentSession } from '@/lib/auth/session';
import { SupplierService } from '@/services/supplier.service';
import { AuditService } from '@/services/audit.service';
import { SupplierStatus } from '@/../generated/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session || session.role === 'CUSTOMER') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const supplier = await db.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      return NextResponse.json({ success: false, error: 'SUPPLIER_NOT_FOUND' }, { status: 404 });
    }

    const metrics = await SupplierService.getSupplierSummaryMetrics(supplier.id);

    return NextResponse.json({
      success: true,
      data: {
        ...supplier,
        metrics,
      },
    });
  } catch (error: any) {
    console.error('[Admin Supplier GET Detail Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN_ROLE' }, { status: 403 });
    }

    const existing = await db.supplier.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'SUPPLIER_NOT_FOUND' }, { status: 404 });
    }

    const body = await req.json();
    const { name, status, contactName, email, phone, whatsapp, telegram, website, notes } = body;

    const updated = await db.supplier.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(status && { status: status as SupplierStatus }),
        contactName,
        email,
        phone,
        whatsapp,
        telegram,
        website,
        notes,
      },
    });

    let action = 'SUPPLIER_UPDATED';
    if (status === 'SUSPENDED') action = 'SUPPLIER_SUSPENDED';
    if (status === 'ACTIVE' && existing.status === 'SUSPENDED') action = 'SUPPLIER_REACTIVATED';

    await AuditService.log({
      actorId: session.userId || 'system',
      action,
      entity: 'Supplier',
      entityId: id,
      before: { name: existing.name, status: existing.status },
      after: { name: updated.name, status: updated.status },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[Admin Supplier PUT Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN_ROLE' }, { status: 403 });
    }

    const supplier = await db.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    if (!supplier) {
      return NextResponse.json({ success: false, error: 'SUPPLIER_NOT_FOUND' }, { status: 404 });
    }

    // Safely unlink references in a transaction and delete supplier record
    await db.$transaction(async (tx) => {
      // 1. Unlink Inventory Items
      await tx.inventoryItem.updateMany({
        where: { supplierId: id },
        data: { supplierId: null },
      });

      // 2. Unlink Shared Accounts
      await tx.sharedAccount.updateMany({
        where: { supplierId: id },
        data: { supplierId: null },
      });

      // 3. Unlink Family Groups
      await tx.familyGroup.updateMany({
        where: { supplierId: id },
        data: { supplierId: null },
      });

      // 4. Unlink Inventory Batches
      await tx.inventoryBatch.updateMany({
        where: { supplierId: id },
        data: { supplierId: null },
      });

      // 5. Unlink Order Items
      await tx.orderItem.updateMany({
        where: { supplierId: id },
        data: { supplierId: null },
      });

      // 6. Unlink Replacement Requests
      await tx.replacementRequest.updateMany({
        where: { supplierId: id },
        data: { supplierId: null },
      });

      // 7. Unlink Incidents
      await tx.inventoryFailureIncident.updateMany({
        where: { supplierId: id },
        data: { supplierId: null },
      });

      // 8. Delete Supplier Warranty Claims & Responses/Links/Evidence if any
      const claims = await tx.supplierWarrantyClaim.findMany({
        where: { supplierId: id },
        select: { id: true },
      });
      const claimIds = claims.map((c) => c.id);
      if (claimIds.length > 0) {
        await tx.supplierClaimReplacementLink.deleteMany({
          where: { claimId: { in: claimIds } },
        });
        await tx.supplierClaimResponse.deleteMany({
          where: { claimId: { in: claimIds } },
        });
        await tx.supplierClaimEvidence.deleteMany({
          where: { claimId: { in: claimIds } },
        });
        await tx.supplierWarrantyClaim.deleteMany({
          where: { supplierId: id },
        });
      }

      // 9. Delete Supplier (Cascade will delete policies and recoveries)
      await tx.supplier.delete({
        where: { id },
      });
    });

    await AuditService.log({
      actorId: session.userId || 'system',
      action: 'SUPPLIER_DELETED',
      entity: 'Supplier',
      entityId: id,
      before: { name: supplier.name, code: supplier.code },
      after: null,
    });

    return NextResponse.json({
      success: true,
      message: `Supplier ${supplier.name} (${supplier.code}) berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('[Admin Supplier DELETE Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
