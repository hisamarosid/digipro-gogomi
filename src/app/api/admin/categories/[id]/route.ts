import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { AuditService } from '@/services/audit.service';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const { name, slug, description, icon, sortOrder, active } = body;

    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    if (slug && slug !== existing.slug) {
      const slugCheck = await db.category.findUnique({ where: { slug } });
      if (slugCheck) {
        return NextResponse.json({ success: false, error: `Slug "${slug}" sudah digunakan` }, { status: 400 });
      }
    }

    const updatedCategory = await db.category.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        slug: slug !== undefined ? slug : existing.slug,
        description: description !== undefined ? description : existing.description,
        icon: icon !== undefined ? icon : existing.icon,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
        active: active !== undefined ? Boolean(active) : existing.active,
      },
    });

    await AuditService.log({
      actorId: session.userId,
      action: 'CATEGORY_UPDATED',
      entity: 'Category',
      entityId: id,
      before: JSON.stringify(existing),
      after: JSON.stringify(updatedCategory),
    });

    return NextResponse.json({
      success: true,
      message: 'Kategori berhasil diperbarui!',
      data: updatedCategory,
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
    const session = await requireAdmin();
    const { id } = await params;

    const existing = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    if (existing._count.products > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Kategori tidak dapat dihapus karena masih terhubung dengan ${existing._count.products} produk.`,
        },
        { status: 400 }
      );
    }

    await db.category.delete({ where: { id } });

    await AuditService.log({
      actorId: session.userId,
      action: 'CATEGORY_DELETED',
      entity: 'Category',
      entityId: id,
      before: JSON.stringify(existing),
    });

    return NextResponse.json({
      success: true,
      message: 'Kategori berhasil dihapus.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
