import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { SupplierService } from '@/services/supplier.service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session || session.role === 'CUSTOMER') {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const productVariantId = searchParams.get('productVariantId') || undefined;
    const orderStatus = searchParams.get('orderStatus') || undefined;
    const search = searchParams.get('search') || undefined;

    const data = await SupplierService.getSupplierSales(id, {
      page,
      limit,
      startDate,
      endDate,
      productVariantId,
      orderStatus,
      search,
    });

    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error('[Admin Supplier Sales GET Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
