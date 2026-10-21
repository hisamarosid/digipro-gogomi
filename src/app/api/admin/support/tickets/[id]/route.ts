import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { status, priority } = body;

    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status;
    if (priority) dataToUpdate.priority = priority;

    const updatedTicket = await db.supportTicket.update({
      where: { id },
      data: dataToUpdate,
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { orderNumber: true } },
        messages: {
          include: { sender: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Status tiket berhasil diperbarui',
      data: updatedTicket,
    });
  } catch (err: any) {
    console.error('PUT /api/admin/support/tickets/[id] error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
