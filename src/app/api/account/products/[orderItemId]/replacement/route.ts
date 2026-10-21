import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireVerifiedCustomer, handleAuthError } from '@/lib/auth/session';
import { ReplacementEligibilityService } from '@/services/replacement/eligibility';
import { ReplacementService } from '@/services/replacement/replacement-service';
import { db } from '@/lib/db/prisma';
import { formatRevealedPayload } from '@/lib/security/encryption';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  try {
    const session = await requireAuth();
    const { orderItemId } = await params;

    const eligibility = await ReplacementEligibilityService.checkReplacementEligibility(
      orderItemId,
      session.userId
    );

    // Fetch replacement history
    const history = await db.replacementRequest.findMany({
      where: { orderItemId },
      include: {
        newFulfillment: {
          select: { id: true, payloadRevealed: true, deliveredAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Mask old credentials in history
    const maskedHistory = history.map((h) => ({
      id: h.id,
      requestNumber: h.requestNumber,
      mode: h.mode,
      status: h.status,
      reason: h.reason,
      requestedAt: h.requestedAt,
      processedAt: h.processedAt,
      maskedPayload: h.newFulfillment?.payloadRevealed
        ? formatRevealedPayload(h.newFulfillment.payloadRevealed).replace(/(?<=.{3}).(?=.*@)/g, '*')
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...eligibility,
        emailVerified: Boolean(session.emailVerified),
        history: maskedHistory,
      },
    });
  } catch (err: any) {
    return handleAuthError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderItemId: string }> }
) {
  try {
    const session = await requireVerifiedCustomer();
    const { orderItemId } = await params;
    const body = await req.json().catch(() => ({}));
    const idempotencyKey = req.headers.get('Idempotency-Key') || req.headers.get('idempotency-key') || undefined;

    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const result = await ReplacementService.requestReplacement({
      orderItemId,
      userId: session.userId,
      reason: body.reason,
      customerNote: body.customerNote,
      idempotencyKey,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return handleAuthError(err);
  }
}
