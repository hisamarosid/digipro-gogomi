import { db } from '@/lib/db/prisma';
import { encryptPayload, decryptPayload, formatRevealedPayload } from '@/lib/security/encryption';
import {
  FamilyGroupStatus,
  SharedSlotStatus,
  FamilyInvitationStatus,
} from '../../generated/prisma';

export interface CreateFamilyGroupInput {
  productVariantId: string;
  groupReference: string;
  ownerCredentialPlain?: string;
  maxMembers?: number;
  masterExpiresAt?: Date | null;
  supplierId?: string | null;
  acquisitionCost?: number;
  supplierReference?: string | null;
  purchasedAt?: Date | null;
  sourceType?: any;
  costAllocationMode?: any;
  verificationRequired?: boolean;
  verificationMethod?: any;
  verificationEmail?: string | null;
  verificationAccessUrl?: string | null;
  verificationMailboxId?: string | null;
  verificationProvider?: string | null;
  verificationInstructions?: string | null;
}

export class FamilyGroupService {
  /**
   * Creates a FamilyGroup and its child member slots atomically
   */
  static async createFamilyGroup(input: CreateFamilyGroupInput) {
    const variant = await db.productVariant.findUnique({
      where: { id: input.productVariantId },
    });

    if (!variant) {
      throw new Error(`Product variant ${input.productVariantId} not found`);
    }

    const maxMembers = input.maxMembers || 5;
    const ownerCredentialEncrypted = input.ownerCredentialPlain
      ? JSON.stringify(encryptPayload(input.ownerCredentialPlain))
      : null;

    const group = await db.$transaction(async (tx) => {
      const familyGroup = await tx.familyGroup.create({
        data: {
          productVariantId: variant.id,
          groupReference: input.groupReference,
          ownerCredentialEncrypted,
          maxMembers,
          status: FamilyGroupStatus.AVAILABLE,
          masterExpiresAt: input.masterExpiresAt || null,
          supplierId: input.supplierId || null,
          acquisitionCost: input.acquisitionCost || 0,
          supplierReference: input.supplierReference || null,
          purchasedAt: input.purchasedAt || null,
          sourceType: input.sourceType || 'INTERNAL',
          costAllocationMode: input.costAllocationMode || 'EQUAL_PER_SLOT',
          verificationRequired: Boolean(input.verificationRequired),
          verificationMethod: input.verificationMethod || 'NONE',
          verificationEmail: input.verificationEmail || null,
          verificationAccessUrl: input.verificationAccessUrl || null,
          verificationMailboxId: input.verificationMailboxId || null,
          verificationProvider: input.verificationProvider || null,
          verificationInstructions: input.verificationInstructions || null,
        },
      });

      const membersData = [];
      for (let i = 1; i <= maxMembers; i++) {
        membersData.push({
          familyGroupId: familyGroup.id,
          slotNumber: i,
          status: SharedSlotStatus.AVAILABLE,
          invitationStatus: FamilyInvitationStatus.NOT_ASSIGNED,
        });
      }

      await tx.familyMemberSlot.createMany({
        data: membersData,
      });

      return familyGroup;
    });

    return await db.familyGroup.findUnique({
      where: { id: group.id },
      include: { members: { orderBy: { slotNumber: 'asc' } } },
    });
  }

  /**
   * Finds an eligible FamilyGroup for allocation
   */
  static async findEligibleFamilyGroup(variantId: string) {
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) return null;

    const now = new Date();
    const subscriptionDays = variant.subscriptionDays || 30;
    const minMasterExpiresAt = new Date(now.getTime() + (subscriptionDays + 2) * 24 * 60 * 60 * 1000);

    const groups = await db.familyGroup.findMany({
      where: {
        productVariantId: variantId,
        status: { in: [FamilyGroupStatus.AVAILABLE, FamilyGroupStatus.PARTIALLY_USED] },
        members: {
          some: { status: SharedSlotStatus.AVAILABLE },
        },
        OR: [
          { masterExpiresAt: null },
          { masterExpiresAt: { gte: minMasterExpiresAt } },
        ],
      },
      include: {
        members: {
          where: { status: SharedSlotStatus.AVAILABLE },
          orderBy: { slotNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return groups.length > 0 ? groups[0] : null;
  }

  /**
   * Concurrency-safe atomic family slot allocation
   */
  static async allocateMemberSlotTx(
    tx: any,
    variantId: string,
    orderItemId: string,
    invitationEmail?: string,
    userId?: string
  ): Promise<{
    success: boolean;
    slot?: any;
    familyGroup?: any;
    reason?: string;
  }> {
    const group = await this.findEligibleFamilyGroup(variantId);

    if (!group) {
      return { success: false, reason: 'NO_ELIGIBLE_FAMILY_GROUP' };
    }

    const availableSlot = await tx.familyMemberSlot.findFirst({
      where: {
        familyGroupId: group.id,
        status: SharedSlotStatus.AVAILABLE,
      },
      orderBy: { slotNumber: 'asc' },
    });

    if (!availableSlot) {
      return { success: false, reason: 'RACE_CONDITION_NO_FAMILY_SLOT_AVAILABLE' };
    }

    const orderItem = await tx.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true, variant: true },
    });

    const now = new Date();
    const days = orderItem?.variant?.subscriptionDays || 30;
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const memberEmailEncrypted = invitationEmail ? JSON.stringify(encryptPayload(invitationEmail)) : null;

    const assignedSlot = await tx.familyMemberSlot.update({
      where: { id: availableSlot.id },
      data: {
        status: SharedSlotStatus.ASSIGNED,
        userId: userId || orderItem?.order?.userId || null,
        orderId: orderItem?.orderId || null,
        orderItemId,
        memberEmailEncrypted,
        invitationStatus: FamilyInvitationStatus.INVITED,
        invitedAt: now,
        activatedAt: now,
        expiresAt,
      },
    });

    const remainingAvailableCount = await tx.familyMemberSlot.count({
      where: {
        familyGroupId: group.id,
        status: SharedSlotStatus.AVAILABLE,
      },
    });

    const newGroupStatus =
      remainingAvailableCount === 0
        ? FamilyGroupStatus.FULL
        : remainingAvailableCount < group.maxMembers
        ? FamilyGroupStatus.PARTIALLY_USED
        : FamilyGroupStatus.AVAILABLE;

    await tx.familyGroup.update({
      where: { id: group.id },
      data: { status: newGroupStatus },
    });

    return {
      success: true,
      slot: assignedSlot,
      familyGroup: group,
    };
  }

  /**
   * Helper to format sanitized customer payload for family group display
   */
  static getSanitizedCustomerPayload(familyGroup: any, slot: any): string {
    let credentialText = '';
    if (familyGroup?.ownerCredentialEncrypted) {
      try {
        const parsed = JSON.parse(familyGroup.ownerCredentialEncrypted);
        credentialText = formatRevealedPayload(decryptPayload(parsed));
      } catch {
        credentialText = formatRevealedPayload(familyGroup.ownerCredentialEncrypted);
      }
    }
    let slotEmail = '';
    if (slot?.memberEmailEncrypted) {
      try {
        const parsed = JSON.parse(slot.memberEmailEncrypted);
        slotEmail = formatRevealedPayload(decryptPayload(parsed));
      } catch {
        slotEmail = formatRevealedPayload(slot.memberEmailEncrypted);
      }
    }

    let payload = `Family Group: ${familyGroup.groupReference}`;
    if (slotEmail) {
      payload += `\nInvitation Email: ${slotEmail}`;
    }
    if (credentialText) {
      payload += `\nOwner Credential: ${credentialText}`;
    }
    return payload;
  }
}
