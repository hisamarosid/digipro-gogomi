import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { getCurrentSession } from '@/lib/auth/session';
import { SupplierService } from '@/services/supplier.service';
import { AuditService } from '@/services/audit.service';
import { SupplierStatus } from '@/../generated/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role === 'CUSTOMER') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const suppliersWithMetrics = await SupplierService.getSuppliersList();
    return NextResponse.json({ success: true, data: suppliersWithMetrics });
  } catch (error: any) {
    console.error('[Admin Suppliers GET Error]:', error);
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
    const { name, contactName, email, phone, whatsapp, website, notes, defaultCurrency } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'SUPPLIER_NAME_REQUIRED' }, { status: 400 });
    }

    const code = await SupplierService.generateSupplierCode();

    const supplier = await db.supplier.create({
      data: {
        name: name.trim(),
        code,
        status: SupplierStatus.ACTIVE,
        contactName,
        email,
        phone,
        whatsapp,
        website,
        notes,
        defaultCurrency: defaultCurrency || 'IDR',
      },
    });

    await AuditService.log({
      actorId: session.userId || 'system',
      action: 'SUPPLIER_CREATED',
      entity: 'Supplier',
      entityId: supplier.id,
      after: { name: supplier.name, code: supplier.code },
    });

    return NextResponse.json({ success: true, data: supplier });
  } catch (error: any) {
    console.error('[Admin Suppliers POST Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
