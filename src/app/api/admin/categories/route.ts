import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { AuditService } from '@/services/audit.service';

export async function GET() {
  try {
    await requireAdmin();
    const categories = await db.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();

    const { name, slug, description, icon, sortOrder, active } = body;

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: 'Nama dan Slug kategori wajib diisi' }, { status: 400 });
    }

    const existingSlug = await db.category.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      return NextResponse.json({ success: false, error: `Slug "${slug}" sudah digunakan` }, { status: 400 });
    }

    const newCategory = await db.category.create({
      data: {
        name,
        slug,
        description: description || null,
        icon: icon || null,
        sortOrder: Number(sortOrder) || 0,
        active: active !== false,
      },
    });

    await AuditService.log({
      actorId: session.userId,
      action: 'CATEGORY_CREATED',
      entity: 'Category',
      entityId: newCategory.id,
      after: JSON.stringify(newCategory),
    });

    return NextResponse.json({
      success: true,
      message: 'Kategori baru berhasil dibuat!',
      data: newCategory,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
