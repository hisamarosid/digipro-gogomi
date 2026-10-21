import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { EmailJobStatus } from '../../../../../../generated/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      db.emailJob.findMany({
        where: {
          status: EmailJobStatus.DEV_CAPTURED,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.emailJob.count({
        where: {
          status: EmailJobStatus.DEV_CAPTURED,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Unauthorized' },
      { status: 401 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireSuperAdmin();

    await db.emailJob.deleteMany({
      where: {
        status: EmailJobStatus.DEV_CAPTURED,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Semua email dev captured berhasil dibersihkan',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Unauthorized' },
      { status: 401 }
    );
  }
}
