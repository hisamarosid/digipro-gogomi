import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/session';
import { PermissionService } from '@/services/permission.service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const body = await req.json();

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const updated = await PermissionService.updateAdmin(
      id,
      body,
      session.userId,
      ip,
      userAgent
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (err.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Akses Ditolak: Hanya Super Admin yang berwenang mengubah admin.' }, { status: 403 });
    }
    console.error('[Admin Update API Error]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 400 });
  }
}
