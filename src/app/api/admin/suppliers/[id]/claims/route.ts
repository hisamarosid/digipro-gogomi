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
    const status = searchParams.get('status') || undefined;

    const data = await SupplierService.getSupplierWarrantyClaims(id, {
      page,
      limit,
      status,
    });

    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error('[Admin Supplier Claims GET Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
