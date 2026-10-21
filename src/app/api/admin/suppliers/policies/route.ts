import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');

    const where: any = {};
    if (supplierId) where.supplierId = supplierId;

    const policies = await db.supplierWarrantyPolicy.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: policies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await req.json();
    const {
      supplierId,
      name,
      warrantyDays,
      claimDeadlineDays,
      claimStartsFrom,
      replacementAllowed,
      refundAllowed,
      partialRefundAllowed,
      supplierCreditAllowed,
      defaultClaimInstructions,
      claimMessageTemplate,
      notes,
    } = body;

    if (!supplierId || !name) {
      return NextResponse.json({ success: false, error: 'SUPPLIER_AND_NAME_REQUIRED' }, { status: 400 });
    }

    const policy = await db.supplierWarrantyPolicy.create({
      data: {
        supplierId,
        name: name.trim(),
        warrantyDays: warrantyDays ? Number(warrantyDays) : 30,
        claimDeadlineDays: claimDeadlineDays ? Number(claimDeadlineDays) : (warrantyDays ? Number(warrantyDays) : 30),
        claimStartsFrom: claimStartsFrom || 'PURCHASE_DATE',
        replacementAllowed: replacementAllowed !== undefined ? Boolean(replacementAllowed) : true,
        refundAllowed: refundAllowed !== undefined ? Boolean(refundAllowed) : true,
        partialRefundAllowed: partialRefundAllowed !== undefined ? Boolean(partialRefundAllowed) : true,
        supplierCreditAllowed: supplierCreditAllowed !== undefined ? Boolean(supplierCreditAllowed) : true,
        defaultClaimInstructions,
        claimMessageTemplate,
        notes,
      },
    });

    return NextResponse.json({ success: true, data: policy });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
