import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { FeatureFlagService, FeatureKey } from '@/services/featureFlag.service';
import { db } from '@/lib/db/prisma';

export async function GET() {
  try {
    await requireAdmin();

    const [flags, auditLogs] = await Promise.all([
      FeatureFlagService.getAllFlags(),
      db.auditLog.findMany({
        where: { entity: 'FEATURE_FLAG' },
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { timestamp: 'desc' },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        flags,
        auditLogs,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'FORBIDDEN' }, { status: 403 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { featureKey, enabled } = body as { featureKey: FeatureKey; enabled: boolean };

    if (!featureKey) {
      return NextResponse.json({ error: 'featureKey wajib diisi' }, { status: 400 });
    }

    const updatedFlags = await FeatureFlagService.updateFlag(featureKey, enabled, session.userId);

    return NextResponse.json({
      success: true,
      message: `Fitur ${featureKey} berhasil ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`,
      data: updatedFlags,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'INTERNAL_ERROR' }, { status: 500 });
  }
}
