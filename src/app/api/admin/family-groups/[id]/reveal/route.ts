import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { db } from '@/lib/db/prisma';
import { decryptPayload, formatRevealedPayload } from '@/lib/security/encryption';
import { AuditService } from '@/services/audit.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(PERMISSIONS.INVENTORY_VIEW_SENSITIVE);
    const { id } = await params;

    const group = await db.familyGroup.findUnique({
      where: { id },
      include: {
        variant: { select: { name: true } },
      },
    });

    if (!group) {
      return NextResponse.json({ success: false, error: 'Family Group tidak ditemukan' }, { status: 404 });
    }

    if (!group.ownerCredentialEncrypted) {
      return NextResponse.json({ success: false, error: 'Kredensial owner tidak tersimpan pada grup ini' }, { status: 400 });
    }

    let credentialPlain = '';
    try {
      credentialPlain = formatRevealedPayload(decryptPayload(group.ownerCredentialEncrypted));
    } catch (err: any) {
      console.error('[Family Group Reveal Error]:', err);
      return NextResponse.json({
        success: false,
        error: 'Gagal dekripsi kredensial. Kunci enkripsi tidak cocok atau data rusak.',
      }, { status: 400 });
    }

    await AuditService.log({
      actorId: session.userId,
      action: 'REVEAL_FAMILY_GROUP_CREDENTIAL',
      entity: 'FamilyGroup',
      entityId: id,
      after: JSON.stringify({ groupReference: group.groupReference, variant: group.variant?.name }),
    });

    return NextResponse.json({
      success: true,
      credential: credentialPlain,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
}
