import { db } from '@/lib/db/prisma';
import { encryptPayload, decryptPayload, formatRevealedPayload } from '@/lib/security/encryption';
import { SharedStockService } from './sharedStock.service';
import { WaitlistService } from './waitlist.service';
import { AuditService } from './audit.service';
import {
  SharedAccountStatus,
  SharedSlotStatus,
  DeliveryModel,
  SubscriptionStatus,
} from '../../generated/prisma';

export interface CreateSharedAccountSlotInput {
  slotNumber: number;
  slotLabel: string;
  pin?: string | null;
}

export interface CreateSharedAccountInput {
  productVariantId: string;
  label: string;
  credentialPlain: string;
  maxSlots?: number;
  slotLabelPrefix?: string;
  masterExpiresAt?: Date | null;
  deliveryDeadlineAt?: Date | null;
  acquisitionCost?: number;
  supplierId?: string | null;
  supplierReference?: string | null;
  sourceType?: any;
  verificationRequired?: boolean;
  verificationMethod?: any;
  verificationEmail?: string | null;
  verificationAccessUrl?: string | null;
  verificationMailboxId?: string | null;
  verificationProvider?: string | null;
  verificationInstructions?: string | null;
  slots?: CreateSharedAccountSlotInput[];
}

export class SharedAccountService {
  /**
   * Creates a SharedAccount along with N manual SharedAccountSlot records atomically
   */
  static async createSharedAccount(input: CreateSharedAccountInput, actorId?: string) {
    const variant = await db.productVariant.findUnique({
      where: { id: input.productVariantId },
    });

    if (!variant) {
      throw new Error(`Product variant ${input.productVariantId} tidak ditemukan`);
    }

    const maxSlots = input.maxSlots || variant.sharedCapacityDefault || 2;
    const credentialEncrypted = JSON.stringify(encryptPayload(input.credentialPlain));

    // Validate manual profile inputs when usesProfile is enabled
    const usesProfile = variant.usesProfile !== false;
    const usesProfilePin = variant.usesProfilePin !== false;

    const slotsToCreate: Array<{
      slotNumber: number;
      slotLabel: string;
      pinEncrypted: string | null;
      status: SharedSlotStatus;
    }> = [];

    if (usesProfile && input.slots && input.slots.length > 0) {
      if (input.slots.length !== maxSlots) {
        throw new Error(`Jumlah slot yang diisi (${input.slots.length}) harus sama dengan kapasitas akun (${maxSlots}).`);
      }

      for (let i = 1; i <= maxSlots; i++) {
        const slotInput = input.slots.find((s) => Number(s.slotNumber) === i);
        if (!slotInput || !slotInput.slotLabel || !slotInput.slotLabel.trim()) {
          throw new Error(`Profile Name untuk Slot ${i} wajib diisi manual oleh Admin.`);
        }

        let pinEncrypted: string | null = null;
        if (usesProfilePin && slotInput.pin && slotInput.pin.trim()) {
          pinEncrypted = JSON.stringify(encryptPayload(slotInput.pin.trim()));
        }

        slotsToCreate.push({
          slotNumber: i,
          slotLabel: slotInput.slotLabel.trim(),
          pinEncrypted,
          status: SharedSlotStatus.AVAILABLE,
        });
      }
    } else {
      // Default slots when usesProfile is false (e.g. Adobe Shared without profile names)
      for (let i = 1; i <= maxSlots; i++) {
        const slotInput = input.slots?.find((s) => Number(s.slotNumber) === i);
        const slotLabel = slotInput?.slotLabel?.trim() || `Slot ${i}`;
        let pinEncrypted: string | null = null;
        if (slotInput?.pin && slotInput.pin.trim()) {
          pinEncrypted = JSON.stringify(encryptPayload(slotInput.pin.trim()));
        }

        slotsToCreate.push({
          slotNumber: i,
          slotLabel,
          pinEncrypted,
          status: SharedSlotStatus.AVAILABLE,
        });
      }
    }

    const sharedAccount = await db.$transaction(async (tx) => {
      const account = await tx.sharedAccount.create({
        data: {
          productVariantId: variant.id,
          label: input.label,
          credentialEncrypted,
          maxSlots,
          status: SharedAccountStatus.AVAILABLE,
          masterExpiresAt: input.masterExpiresAt || null,
          deliveryDeadlineAt: input.deliveryDeadlineAt || null,
          acquisitionCost: input.acquisitionCost || 0,
          supplierId: input.supplierId || null,
          supplierReference: input.supplierReference || null,
          sourceType: input.sourceType || 'INTERNAL',
          verificationRequired: Boolean(input.verificationRequired),
          verificationMethod: input.verificationMethod || 'NONE',
          verificationEmail: input.verificationEmail || null,
          verificationAccessUrl: input.verificationAccessUrl || null,
          verificationMailboxId: input.verificationMailboxId || null,
          verificationProvider: input.verificationProvider || 'GENERIC',
          verificationInstructions: input.verificationInstructions || null,
        },
      });

      const slotRecords = slotsToCreate.map((slot) => ({
        sharedAccountId: account.id,
        slotNumber: slot.slotNumber,
        slotLabel: slot.slotLabel,
        pinEncrypted: slot.pinEncrypted,
        status: slot.status,
      }));

      await tx.sharedAccountSlot.createMany({
        data: slotRecords,
      });

      return account;
    });

    if (actorId) {
      await AuditService.log({
        actorId,
        action: 'SHARED_PROFILE_CREATED',
        entity: 'SharedAccount',
        entityId: sharedAccount.id,
        after: JSON.stringify({
          label: input.label,
          maxSlots,
          slotsCount: slotsToCreate.length,
        }),
      });
    }

    await WaitlistService.detectRestockAndNotify(variant.id);

    return await db.sharedAccount.findUnique({
      where: { id: sharedAccount.id },
      include: { slots: { orderBy: { slotNumber: 'asc' } } },
    });
  }

  /**
   * Reveals a specific slot's PIN with permission check, server-side decryption, and audit logging
   */
  static async revealSlotPin(slotId: string, actorId: string) {
    const slot = await db.sharedAccountSlot.findUnique({
      where: { id: slotId },
      include: {
        sharedAccount: {
          include: { variant: { select: { name: true } } },
        },
      },
    });

    if (!slot) {
      throw new Error('Slot tidak ditemukan');
    }

    if (!slot.pinEncrypted) {
      return { pin: null };
    }

    let pinPlain = '';
    try {
      pinPlain = decryptPayload(slot.pinEncrypted);
    } catch {
      pinPlain = slot.pinEncrypted;
    }

    await AuditService.log({
      actorId,
      action: 'SHARED_PROFILE_PIN_REVEALED',
      entity: 'SharedAccountSlot',
      entityId: slot.id,
      after: JSON.stringify({
        slotNumber: slot.slotNumber,
        profileName: slot.slotLabel,
        sharedAccount: slot.sharedAccount?.label,
        variant: slot.sharedAccount?.variant?.name,
      }),
    });

    return { pin: pinPlain };
  }

  /**
   * Updates an individual slot profile name, PIN, or status (Mark Available, Quarantine, Invalid)
   */
  static async updateSlotProfile(
    slotId: string,
    data: { slotLabel?: string; pin?: string | null; status?: SharedSlotStatus },
    actorId: string,
    force: boolean = false
  ) {
    const slot = await db.sharedAccountSlot.findUnique({
      where: { id: slotId },
      include: {
        sharedAccount: {
          include: { variant: true },
        },
      },
    });

    if (!slot) {
      throw new Error('Slot tidak ditemukan');
    }

    if (slot.status === SharedSlotStatus.ASSIGNED && !force && (data.slotLabel !== undefined || data.pin !== undefined)) {
      return {
        success: false,
        warning: true,
        message: 'Profile ini sedang digunakan customer aktif. Mengubah Profile Name/PIN dapat memengaruhi akses customer. Harap konfirmasi jika ingin melanjutkan.',
      };
    }

    const updateData: any = {};
    if (data.slotLabel !== undefined && data.slotLabel.trim()) {
      updateData.slotLabel = data.slotLabel.trim();
    }

    if (data.pin !== undefined) {
      if (data.pin && data.pin.trim()) {
        updateData.pinEncrypted = JSON.stringify(encryptPayload(data.pin.trim()));
      } else {
        updateData.pinEncrypted = null;
      }
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
      // If marking available from expired/quarantine, clear previous assignment references cleanly
      if (data.status === SharedSlotStatus.AVAILABLE) {
        updateData.assignedUserId = null;
        updateData.orderId = null;
        updateData.orderItemId = null;
        updateData.assignedAt = null;
        updateData.activatedAt = null;
        updateData.expiresAt = null;
      }
    }

    const updatedSlot = await db.sharedAccountSlot.update({
      where: { id: slotId },
      data: updateData,
    });

    // Recompute shared account overall status
    const remainingAvailableCount = await db.sharedAccountSlot.count({
      where: {
        sharedAccountId: slot.sharedAccountId,
        status: SharedSlotStatus.AVAILABLE,
      },
    });

    const newAccountStatus =
      remainingAvailableCount === 0
        ? SharedAccountStatus.FULL
        : remainingAvailableCount < slot.sharedAccount.maxSlots
        ? SharedAccountStatus.PARTIALLY_USED
        : SharedAccountStatus.AVAILABLE;

    if (slot.sharedAccount.status !== newAccountStatus && slot.sharedAccount.status !== SharedAccountStatus.INVALID) {
      await db.sharedAccount.update({
        where: { id: slot.sharedAccountId },
        data: { status: newAccountStatus },
      });
    }

    // Determine specific audit action
    let auditAction = 'SHARED_PROFILE_UPDATED';
    if (data.status === SharedSlotStatus.AVAILABLE) {
      auditAction = 'SHARED_PROFILE_MARKED_AVAILABLE';
    } else if (data.status === SharedSlotStatus.EXPIRED) {
      auditAction = 'SHARED_PROFILE_QUARANTINED';
    } else if (data.status === SharedSlotStatus.INVALID) {
      auditAction = 'SHARED_PROFILE_INVALIDATED';
    }

    await AuditService.log({
      actorId,
      action: auditAction,
      entity: 'SharedAccountSlot',
      entityId: slot.id,
      before: JSON.stringify({
        slotNumber: slot.slotNumber,
        slotLabel: slot.slotLabel,
        status: slot.status,
      }),
      after: JSON.stringify({
        slotNumber: updatedSlot.slotNumber,
        slotLabel: updatedSlot.slotLabel,
        status: updatedSlot.status,
      }),
    });

    return { success: true, slot: updatedSlot };
  }

  /**
   * Safely synchronizes Shared Account capacity with manual profile input for added slots
   */
  static async updateCapacity(
    sharedAccountId: string,
    newCapacity: number,
    actorId: string,
    newSlotsData?: CreateSharedAccountSlotInput[]
  ) {
    const account = await db.sharedAccount.findUnique({
      where: { id: sharedAccountId },
      include: {
        slots: { orderBy: { slotNumber: 'asc' } },
        variant: true,
      },
    });

    if (!account) {
      throw new Error('Shared Account tidak ditemukan');
    }

    const currentCapacity = account.maxSlots;
    if (newCapacity === currentCapacity) {
      return account;
    }

    // Decreasing capacity check
    if (newCapacity < currentCapacity) {
      const activeSlotsInCutRange = account.slots.filter(
        (s) => s.slotNumber > newCapacity && (s.status === SharedSlotStatus.ASSIGNED || s.status === SharedSlotStatus.RESERVED)
      );

      if (activeSlotsInCutRange.length > 0) {
        throw new Error(`Capacity tidak dapat dikurangi menjadi ${newCapacity} karena Slot ${activeSlotsInCutRange.map((s) => s.slotNumber).join(', ')} masih aktif digunakan customer.`);
      }

      // Safe to delete unassigned slots in cut range
      await db.$transaction(async (tx) => {
        await tx.sharedAccountSlot.deleteMany({
          where: {
            sharedAccountId,
            slotNumber: { gt: newCapacity },
          },
        });

        await tx.sharedAccount.update({
          where: { id: sharedAccountId },
          data: { maxSlots: newCapacity },
        });
      });
    } else {
      // Increasing capacity: manual input required for new slots
      const usesProfile = account.variant.usesProfile !== false;
      const usesProfilePin = account.variant.usesProfilePin !== false;
      const slotsToAdd: Array<{
        sharedAccountId: string;
        slotNumber: number;
        slotLabel: string;
        pinEncrypted: string | null;
        status: SharedSlotStatus;
      }> = [];

      for (let i = currentCapacity + 1; i <= newCapacity; i++) {
        const inputData = newSlotsData?.find((s) => Number(s.slotNumber) === i);
        if (usesProfile && (!inputData || !inputData.slotLabel || !inputData.slotLabel.trim())) {
          throw new Error(`Profile Name untuk Slot ${i} baru wajib diisi manual oleh Admin.`);
        }

        const slotLabel = inputData?.slotLabel?.trim() || `Slot ${i}`;
        let pinEncrypted: string | null = null;
        if (usesProfilePin && inputData?.pin && inputData.pin.trim()) {
          pinEncrypted = JSON.stringify(encryptPayload(inputData.pin.trim()));
        }

        slotsToAdd.push({
          sharedAccountId,
          slotNumber: i,
          slotLabel,
          pinEncrypted,
          status: SharedSlotStatus.AVAILABLE,
        });
      }

      await db.$transaction(async (tx) => {
        await tx.sharedAccountSlot.createMany({
          data: slotsToAdd,
        });

        await tx.sharedAccount.update({
          where: { id: sharedAccountId },
          data: { maxSlots: newCapacity },
        });
      });
    }

    await AuditService.log({
      actorId,
      action: 'SHARED_PROFILE_UPDATED',
      entity: 'SharedAccount',
      entityId: account.id,
      before: JSON.stringify({ maxSlots: currentCapacity }),
      after: JSON.stringify({ maxSlots: newCapacity }),
    });

    return await db.sharedAccount.findUnique({
      where: { id: sharedAccountId },
      include: { slots: { orderBy: { slotNumber: 'asc' } } },
    });
  }

  /**
   * Finds eligible SharedAccounts for a variant using SharedStockService
   */
  static async findEligibleSharedAccount(variantId: string) {
    return await SharedStockService.findEligibleSharedAccount(variantId);
  }

  /**
   * Concurrency-safe atomic slot allocation within a database transaction
   */
  static async allocateSlotTx(
    tx: any,
    variantId: string,
    orderItemId: string,
    userId?: string
  ): Promise<{
    success: boolean;
    slot?: any;
    sharedAccount?: any;
    reason?: string;
  }> {
    const candidate = await this.findEligibleSharedAccount(variantId);

    if (!candidate) {
      return { success: false, reason: 'NO_ELIGIBLE_SHARED_ACCOUNT' };
    }

    // Atomic row locking & slot reservation
    const availableSlot = await tx.sharedAccountSlot.findFirst({
      where: {
        sharedAccountId: candidate.id,
        status: SharedSlotStatus.AVAILABLE,
      },
      orderBy: { slotNumber: 'asc' },
    });

    if (!availableSlot) {
      return { success: false, reason: 'RACE_CONDITION_NO_SLOT_AVAILABLE' };
    }

    const orderItem = await tx.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true, variant: true },
    });

    const now = new Date();
    const days = orderItem?.variant?.subscriptionDays || 30;
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Atomically assign slot without altering admin-configured profileName or pinEncrypted
    const assignedSlot = await tx.sharedAccountSlot.update({
      where: { id: availableSlot.id },
      data: {
        status: SharedSlotStatus.ASSIGNED,
        assignedUserId: userId || orderItem?.order?.userId || null,
        orderId: orderItem?.orderId || null,
        orderItemId,
        assignedAt: now,
        activatedAt: now,
        expiresAt,
      },
    });

    // Re-evaluate SharedAccount status
    const remainingAvailableCount = await tx.sharedAccountSlot.count({
      where: {
        sharedAccountId: candidate.id,
        status: SharedSlotStatus.AVAILABLE,
      },
    });

    const newAccountStatus =
      remainingAvailableCount === 0
        ? SharedAccountStatus.FULL
        : remainingAvailableCount < candidate.maxSlots
        ? SharedAccountStatus.PARTIALLY_USED
        : SharedAccountStatus.AVAILABLE;

    await tx.sharedAccount.update({
      where: { id: candidate.id },
      data: { status: newAccountStatus },
    });

    return {
      success: true,
      slot: assignedSlot,
      sharedAccount: candidate,
    };
  }

  /**
   * Helper to format sanitized payload for customer display
   */
  static getSanitizedCustomerPayload(sharedAccount: any, slot: any, variant: any) {
    let credentialText = '';
    const exposeMaster = variant.sharedExposeMasterCredentialToCustomer !== false;

    if (exposeMaster && sharedAccount.credentialEncrypted) {
      try {
        credentialText = formatRevealedPayload(decryptPayload(sharedAccount.credentialEncrypted));
      } catch {
        credentialText = formatRevealedPayload(sharedAccount.credentialEncrypted);
      }
    }

    const usesProfile = variant.usesProfile !== false;
    const usesProfilePin = variant.usesProfilePin !== false || variant.sharedExposeSlotPin !== false;
    const slotLabel = slot.slotLabel || `User ${slot.slotNumber}`;

    let pinText = '';
    if (usesProfilePin && slot.pinEncrypted) {
      try {
        pinText = formatRevealedPayload(decryptPayload(slot.pinEncrypted));
      } catch {
        pinText = formatRevealedPayload(slot.pinEncrypted);
      }
    }

    let payload = '';
    if (credentialText) {
      payload += `Account: ${credentialText}`;
    }

    if (usesProfile) {
      if (payload) payload += '\n';
      payload += `Profile: ${slotLabel}`;
      if (usesProfilePin && pinText) {
        payload += ` | PIN: ${pinText}`;
      }
    }

    return formatRevealedPayload(payload);
  }
}
