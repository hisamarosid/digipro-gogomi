import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, requireSuperAdmin } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { PermissionService } from '@/services/permission.service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.PERMISSION_MANAGE);
    const { id } = await params;

    const permissions = await PermissionService.getUserPermissions(id);
    return NextResponse.json({ success: true, data: permissions });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Akses Ditolak: Anda tidak memiliki izin kelola permission.' }, { status: 403 });
    }
    console.error('[Admin Permissions GET API Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 400 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const body = await req.json();

    const { permissions } = body;
    if (!Array.isArray(permissions)) {
      return NextResponse.json({ success: false, error: 'Array permissions wajib dikirimkan.' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    await PermissionService.setAdminPermissions(
      id,
      permissions,
      session.userId,
      ip,
      userAgent
    );

    return NextResponse.json({ success: true, message: 'Permissions berhasil diperbarui.' });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Akses Ditolak: Hanya Super Admin yang berwenang mengatur permissions.' }, { status: 403 });
    }
    console.error('[Admin Permissions PUT API Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 400 });
  }
}
