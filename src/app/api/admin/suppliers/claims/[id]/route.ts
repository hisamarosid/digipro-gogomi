import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const claim = await db.supplierWarrantyClaim.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
            primaryContactMethod: true,
            phone: true,
            whatsapp: true,
            telegram: true,
            email: true,
            website: true,
            marketplaceUrl: true,
          },
        },
        incident: true,
        replacementLink: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            order: { select: { id: true, orderNumber: true } },
          },
        },
        replacementLinks: {
          include: {
            replacement: {
              include: {
                user: { select: { id: true, name: true, email: true } },
                order: { select: { id: true, orderNumber: true } },
              },
            },
          },
        },
        responses: { orderBy: { createdAt: 'desc' } },
        evidences: { orderBy: { createdAt: 'desc' } },
        recoveries: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!claim) {
      return NextResponse.json({ success: false, error: 'CLAIM_NOT_FOUND' }, { status: 404 });
    }

    // Fetch original inventory item metadata (Encrypted payload is NOT returned here)
    const inventory = await db.inventoryItem.findUnique({
      where: { id: claim.assetId },
      select: {
        id: true,
        type: true,
        status: true,
        costAmount: true,
        purchasedAt: true,
        supplierReference: true,
        createdAt: true,
        variant: {
          select: {
            name: true,
            product: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...claim,
        inventory,
      },
    });
  } catch (error: any) {
    console.error('[Admin Claim GET ID Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();
    const { internalNotes, claimValue } = body;

    const updated = await db.supplierWarrantyClaim.update({
      where: { id },
      data: {
        internalNotes: internalNotes !== undefined ? internalNotes : undefined,
        claimValue: claimValue !== undefined ? claimValue : undefined,
        updatedBy: session.userId,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
