import { NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';
import { AuditService } from '@/services/audit.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const customer: any = await db.user.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { items: true },
        },
        subscriptions: {
          orderBy: { expiresAt: 'asc' },
          include: { variant: { include: { product: true } } },
        },
        replacementRequests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        supportTickets: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { orders: true, subscriptions: true, reviews: true, replacementRequests: true, supportTickets: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Pelanggan tidak ditemukan' }, { status: 404 });
    }

    const totalSpent = (customer.orders || [])
      .filter((o: any) => o.status === 'COMPLETED' || o.status === 'PAID')
      .reduce((sum: number, o: any) => sum + (o.grandTotal || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        ...customer,
        totalSpent,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { role, name, email } = body;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: {
        ...(role ? { role } : {}),
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
      },
    });

    await AuditService.log({
      actorId: session.userId,
      action: 'ADMIN_UPDATE_CUSTOMER',
      entity: 'User',
      entityId: id,
      after: { role, name, email },
    });

    return NextResponse.json({
      success: true,
      message: 'Data pelanggan berhasil diperbarui!',
      data: updatedUser,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
