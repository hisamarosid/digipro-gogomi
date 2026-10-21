import React from 'react';
import { getCurrentSession } from '@/lib/auth/session';
import { db } from '@/lib/db/prisma';
import { ProductCredentialsClient } from './ProductCredentialsClient';
import { formatRevealedPayload } from '@/lib/security/encryption';
import { InventoryService } from '@/services/inventory.service';
import { SharedAccountService } from '@/services/sharedAccount.service';
import { FamilyGroupService } from '@/services/familyGroup.service';
import { OrderService } from '@/services/order.service';

export const dynamic = 'force-dynamic';

export default async function CustomerProductsPage() {
  const session = await getCurrentSession();
  if (!session) return null;

  // Proactively auto-claim any guest orders placed with this email so credentials never disappear
  await OrderService.claimGuestOrdersForUser(session.userId, session.email);

  const [paidOrders, existingReviews] = await Promise.all([
    db.order.findMany({
      where: {
        OR: [
          { userId: session.userId },
          { guestEmail: session.email },
        ],
        paymentStatus: 'PAID',
      },
      include: {
        items: {
          include: {
            order: { select: { orderNumber: true, createdAt: true } },
            variant: {
              select: {
                productId: true,
                name: true,
                sku: true,
                warrantyDays: true,
                usesProfile: true,
                usesProfilePin: true,
                sharedExposeMasterCredentialToCustomer: true,
                sharedExposeSlotPin: true,
                product: { select: { slug: true } },
              },
            },
            fulfillments: {
              orderBy: { createdAt: 'desc' },
              include: {
                inventoryItem: true,
                sharedAccountSlot: true,
                familyMemberSlot: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.review.findMany({
      where: { userId: session.userId },
    }),
  ]);

  // Extract all relevant fulfillments (prefer active/fulfilled, fallback to latest)
  const fulfillmentsRaw: any[] = [];

  for (const order of paidOrders) {
    for (const item of order.items) {
      const activeFulfillment = item.fulfillments.find(
        (f) => f.status === 'ACTIVE' || f.status === 'FULFILLED'
      );
      const latestFulfillment = item.fulfillments[0];
      const chosen = activeFulfillment || latestFulfillment;

      if (chosen) {
        fulfillmentsRaw.push({
          ...chosen,
          orderItem: item,
          hasActiveFulfillment: !!activeFulfillment,
        });
      } else {
        // Construct fallback for items awaiting first fulfillment
        fulfillmentsRaw.push({
          id: `placeholder-${item.id}`,
          orderItemId: item.id,
          status: 'PENDING',
          deliveryType: item.deliveryType,
          payloadRevealed: null,
          subscriptionExpires: null,
          orderItem: item,
          hasActiveFulfillment: false,
        });
      }
    }
  }

  // Safely batch-load master accounts and family groups to prevent join inconsistencies
  const masterAccountIds = Array.from(
    new Set(
      fulfillmentsRaw
        .map((f) => f.sharedAccountSlot?.sharedAccountId)
        .filter(Boolean)
    )
  );
  const familyGroupIds = Array.from(
    new Set(
      fulfillmentsRaw
        .map((f) => f.familyMemberSlot?.familyGroupId)
        .filter(Boolean)
    )
  );

  const [masterAccounts, familyGroups] = await Promise.all([
    masterAccountIds.length > 0
      ? db.sharedAccount.findMany({ where: { id: { in: masterAccountIds as string[] } } })
      : [],
    familyGroupIds.length > 0
      ? db.familyGroup.findMany({ where: { id: { in: familyGroupIds as string[] } } })
      : [],
  ]);

  const masterMap = new Map(masterAccounts.map((m) => [m.id, m]));
  const familyMap = new Map(familyGroups.map((g) => [g.id, g]));

  const now = new Date();

  const fulfillments = fulfillmentsRaw.map((f: any) => {
    let slotOrItemExpiry: Date | null = null;

    if (f.subscriptionExpires) {
      slotOrItemExpiry = new Date(f.subscriptionExpires);
    } else if (f.sharedAccountSlot?.expiresAt) {
      slotOrItemExpiry = new Date(f.sharedAccountSlot.expiresAt);
    } else if (f.familyMemberSlot?.expiresAt) {
      slotOrItemExpiry = new Date(f.familyMemberSlot.expiresAt);
    }

    const isExpired = slotOrItemExpiry ? slotOrItemExpiry.getTime() <= now.getTime() : false;

    let livePayload = '';
    if (f.inventoryItem?.payloadCipher) {
      try {
        livePayload = InventoryService.getPlainPayload(f.inventoryItem);
      } catch {
        // Fallback to snapshot
      }
    } else if (f.sharedAccountSlot?.sharedAccountId) {
      const sharedAccount = masterMap.get(f.sharedAccountSlot.sharedAccountId);
      if (sharedAccount) {
        try {
          livePayload = SharedAccountService.getSanitizedCustomerPayload(
            sharedAccount,
            f.sharedAccountSlot,
            f.orderItem?.variant || {}
          );
        } catch {
          // Fallback to snapshot
        }
      }
    } else if (f.familyMemberSlot?.familyGroupId) {
      const familyGroup = familyMap.get(f.familyMemberSlot.familyGroupId);
      if (familyGroup) {
        try {
          livePayload = FamilyGroupService.getSanitizedCustomerPayload(
            familyGroup,
            f.familyMemberSlot
          );
        } catch {
          // Fallback to snapshot
        }
      }
    }

    const finalRawPayload = livePayload || f.payloadRevealed || '';
    const formatted = finalRawPayload ? formatRevealedPayload(finalRawPayload) : '';

    const isPendingReplacement = !f.hasActiveFulfillment && (f.status === 'REVOKED' || f.status === 'REPLACED' || f.status === 'PENDING' || f.status === 'WAITING_STOCK');

    return {
      ...f,
      isExpired,
      isPendingReplacement,
      expiredAt: slotOrItemExpiry ? slotOrItemExpiry.toISOString() : null,
      productSlug: f.orderItem?.variant?.product?.slug || '',
      payloadRevealed: formatted,
    };
  });

  return <ProductCredentialsClient fulfillments={fulfillments} existingReviews={existingReviews} />;
}
