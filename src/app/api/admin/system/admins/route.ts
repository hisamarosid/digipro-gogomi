import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, requireSuperAdmin } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { PermissionService } from '@/services/permission.service';
import { Role } from '@/../generated/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.ADMIN_VIEW);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const roleParam = searchParams.get('role') as Role | undefined;
    const disabledParam = searchParams.get('disabled');

    const disabled = disabledParam === 'true' ? true : disabledParam === 'false' ? false : undefined;

    const admins = await PermissionService.listAdmins({
      search,
      role: roleParam,
      disabled,
    });

    return NextResponse.json({ success: true, data: admins });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Akses Ditolak: Anda tidak memiliki izin untuk melihat daftar admin.' }, { status: 403 });
    }
    console.error('[Admin List API Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const body = await req.json();

    const { name, email, password, role, customPermissions } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Nama, email, password, dan role wajib diisi.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password minimal 8 karakter.' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const admin = await PermissionService.createAdmin(
      {
        name,
        email,
        password,
        role,
        customPermissions,
      },
      session.userId,
      ip,
      userAgent
    );

    return NextResponse.json({ success: true, data: admin });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Akses Ditolak: Hanya Super Admin yang berwenang membuat admin baru.' }, { status: 403 });
    }
    console.error('[Admin Create API Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 400 });
  }
}
