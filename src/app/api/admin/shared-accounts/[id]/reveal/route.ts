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

    const account = await db.sharedAccount.findUnique({
      where: { id },
      include: {
        variant: { select: { name: true } },
      },
    });

    if (!account) {
      return NextResponse.json({ success: false, error: 'Shared Account tidak ditemukan' }, { status: 404 });
    }

    if (!account.credentialEncrypted) {
      return NextResponse.json({ success: false, error: 'Kredensial tidak tersimpan pada akun ini' }, { status: 400 });
    }

    let credentialPlain = '';
    try {
      credentialPlain = formatRevealedPayload(decryptPayload(account.credentialEncrypted));
    } catch (err: any) {
      console.error('[Shared Account Reveal Error]:', err);
      return NextResponse.json({
        success: false,
        error: 'Gagal dekripsi kredensial. Kunci enkripsi tidak cocok atau data rusak.',
      }, { status: 400 });
    }

    await AuditService.log({
      actorId: session.userId,
      action: 'REVEAL_SHARED_ACCOUNT_CREDENTIAL',
      entity: 'SharedAccount',
      entityId: id,
      after: JSON.stringify({ label: account.label, variant: account.variant?.name }),
    });

    return NextResponse.json({
      success: true,
      credential: credentialPlain,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
}
