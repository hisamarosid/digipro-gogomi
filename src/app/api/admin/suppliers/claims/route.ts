import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { SupplierClaimRecommendationService } from '@/services/supplier-warranty/supplier-claim-recommendation.service';
import { SupplierWarrantyEligibilityService } from '@/services/supplier-warranty/supplier-warranty-eligibility.service';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const query = searchParams.get('q')?.trim() || '';

    // AUTO-SYNC STEP: Scan for any INVALID inventory items with a supplier that don't have a claim yet
    try {
      const unlinkedInvalidItems = await db.inventoryItem.findMany({
        where: {
          status: 'INVALID',
          supplierId: { not: null },
        },
        select: { id: true },
        take: 50,
      });

      for (const item of unlinkedInvalidItems) {
        await SupplierClaimRecommendationService.evaluateAndRecommendClaim({
          inventoryId: item.id,
          failureReason: 'ACCOUNT_DISABLED',
          description: 'Auto-synced from INVALID inventory item status',
        });
      }
    } catch (err) {
      console.error('[Supplier Claims Auto-Sync Error]:', err);
    }

    const where: any = {};
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;
    if (query) {
      where.OR = [
        { claimNumber: { contains: query } },
        { supplierClaimReference: { contains: query } },
        { assetId: { contains: query } },
      ];
    }

    const [claims, totalCount] = await Promise.all([
      db.supplierWarrantyClaim.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, code: true, primaryContactMethod: true, phone: true, whatsapp: true } },
          replacementLink: { select: { id: true, requestNumber: true, status: true } },
          replacementLinks: { include: { replacement: { select: { id: true, requestNumber: true } } } },
          responses: { orderBy: { createdAt: 'desc' }, take: 1 },
          recoveries: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.supplierWarrantyClaim.count({ where }),
    ]);

    // Calculate Dashboard Summary Counters
    const allClaims = await db.supplierWarrantyClaim.findMany({
      select: { status: true, claimValue: true, resolutionAmount: true, createdAt: true },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const summary = {
      readyToClaim: allClaims.filter((c) => c.status === 'READY_TO_CLAIM' || c.status === 'DRAFT').length,
      waitingSupplier: allClaims.filter((c) => c.status === 'WAITING_SUPPLIER' || c.status === 'SUBMITTED').length,
      approved: allClaims.filter((c) => c.status === 'APPROVED').length,
      rejected: allClaims.filter((c) => c.status === 'REJECTED').length,
      potentialRecovery: allClaims
        .filter((c) => c.status !== 'CLOSED' && c.status !== 'REJECTED' && c.status !== 'CANCELLED')
        .reduce((sum, c) => sum + (c.claimValue || 0), 0),
      recoveredMonth: allClaims
        .filter((c) => c.status === 'CLOSED' && c.createdAt >= startOfMonth)
        .reduce((sum, c) => sum + (c.resolutionAmount || 0), 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        claims,
        totalCount,
        summary,
      },
    });
  } catch (error: any) {
    console.error('[Admin Claims GET Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await req.json();
    const { supplierId, assetType, assetId, failureReason, description, claimValue } = body;

    if (!supplierId || !assetId || !failureReason) {
      return NextResponse.json({ success: false, error: 'MISSING_REQUIRED_FIELDS' }, { status: 400 });
    }

    const eligibility = await SupplierWarrantyEligibilityService.checkWarrantyEligibility({
      supplierId,
      failureReason,
    });

    const claimNumber = await SupplierClaimRecommendationService.generateClaimNumber();
    const supplier = await db.supplier.findUnique({ where: { id: supplierId } });

    const claim = await db.supplierWarrantyClaim.create({
      data: {
        claimNumber,
        supplierId,
        sourceType: 'ADMIN_MANUAL_REVIEW',
        assetType: assetType || 'DEDICATED_INVENTORY',
        assetId,
        status: 'READY_TO_CLAIM',
        failureReason,
        failureDescription: description || 'Manual admin warranty claim',
        warrantyEligibility: eligibility.eligible,
        ineligibilityReason: eligibility.reason || null,
        warrantyEndsAt: eligibility.warrantyEndsAt,
        claimDeadlineAt: eligibility.claimDeadlineAt,
        claimValue: claimValue || 0,
        supplierNameSnapshot: supplier?.name || 'External Supplier',
        warrantyPolicyNameSnapshot: eligibility.policyName || 'Standard Policy',
        claimValueSnapshot: claimValue || 0,
        createdBy: session.userId,
      },
    });

    return NextResponse.json({ success: true, data: claim });
  } catch (error: any) {
    console.error('[Admin Claims POST Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
