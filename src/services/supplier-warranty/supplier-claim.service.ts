import { db } from '@/lib/db/prisma';
import { AuditService } from '@/services/audit.service';
import { encryptPayload } from '@/lib/security/encryption';
import { NotificationOrchestrator } from '@/services/email/email-orchestrator';
import {
  SupplierContactMethod,
  SupplierClaimResponseType,
  SupplierClaimResolutionType,
  SupplierRecoveryType,
  DeliveryType,
} from '../../../generated/prisma';

export class SupplierClaimService {
  /**
   * Generates formatted claim text for WhatsApp / Telegram / Email external submission
   * NO PASSWORDS OR PINS INCLUDED.
   */
  static async generateClaimMessage(claimId: string): Promise<string> {
    const claim = await db.supplierWarrantyClaim.findUnique({
      where: { id: claimId },
      include: {
        supplier: true,
      },
    });

    if (!claim) {
      throw new Error('CLAIM_NOT_FOUND');
    }

    const inventory = await db.inventoryItem.findUnique({
      where: { id: claim.assetId },
      include: {
        variant: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    const productName = inventory?.variant?.product?.name || 'Produk Digital';
    const variantName = inventory?.variant?.name || 'Standard';
    const purchaseDate = (inventory?.purchasedAt || inventory?.createdAt || claim.createdAt)
      .toISOString()
      .slice(0, 10);
    const failureDate = claim.createdAt.toISOString().slice(0, 10);

    return `Halo Kak, izin mengajukan klaim garansi supplier.

Nomor Klaim: ${claim.claimNumber}
Produk: ${productName}
Varian: ${variantName}
ID Referensi Inventory: ${claim.assetId}
Ref Order Supplier: ${inventory?.supplierReference || 'N/A'}
Tanggal Pembelian: ${purchaseDate}
Tanggal Kendala: ${failureDate}
Kendala: ${claim.failureReason}

Mohon bantuannya untuk pengecekan dan proses penggantian/refund garansi. Terima kasih!`;
  }

  /**
   * Marks a claim as submitted externally via WhatsApp, Telegram, Email, etc.
   */
  static async markSubmitted(params: {
    claimId: string;
    channel: SupplierContactMethod;
    externalReference?: string;
    notes?: string;
    adminUserId: string;
  }) {
    const { claimId, channel, externalReference, notes, adminUserId } = params;

    const claim = await db.supplierWarrantyClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new Error('CLAIM_NOT_FOUND');

    const updated = await db.supplierWarrantyClaim.update({
      where: { id: claimId },
      data: {
        status: 'WAITING_SUPPLIER',
        submittedAt: new Date(),
        submissionChannel: channel,
        supplierClaimReference: externalReference || null,
        waitingSince: new Date(),
        internalNotes: notes ? `${claim.internalNotes || ''}\n[Submitted]: ${notes}` : claim.internalNotes,
        updatedBy: adminUserId,
      },
    });

    await AuditService.log({
      actorId: adminUserId,
      action: 'SUPPLIER_CLAIM_MARKED_SUBMITTED',
      entity: 'SupplierWarrantyClaim',
      entityId: claim.id,
      after: { channel, externalReference, submittedAt: updated.submittedAt },
    });

    return updated;
  }

  /**
   * Records a response received from the external supplier
   */
  static async recordSupplierResponse(params: {
    claimId: string;
    responseType: SupplierClaimResponseType;
    messageSummary: string;
    externalReference?: string;
    adminUserId: string;
  }) {
    const { claimId, responseType, messageSummary, externalReference, adminUserId } = params;

    const claim = await db.supplierWarrantyClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new Error('CLAIM_NOT_FOUND');

    const responseRecord = await db.supplierClaimResponse.create({
      data: {
        claimId,
        responseType,
        messageSummary,
        externalReference: externalReference || null,
        recordedBy: adminUserId,
      },
    });

    let nextStatus = claim.status;
    if (responseType === 'APPROVED_REPLACEMENT') nextStatus = 'APPROVED';
    if (responseType === 'APPROVED_FULL_REFUND' || responseType === 'APPROVED_PARTIAL_REFUND') nextStatus = 'APPROVED';
    if (responseType === 'APPROVED_CREDIT') nextStatus = 'APPROVED';
    if (responseType === 'REJECTED') nextStatus = 'REJECTED';

    const updated = await db.supplierWarrantyClaim.update({
      where: { id: claimId },
      data: {
        status: nextStatus,
        approvedAt: nextStatus === 'APPROVED' ? new Date() : claim.approvedAt,
        rejectedAt: nextStatus === 'REJECTED' ? new Date() : claim.rejectedAt,
        updatedBy: adminUserId,
      },
    });

    await AuditService.log({
      actorId: adminUserId,
      action: 'SUPPLIER_RESPONSE_RECORDED',
      entity: 'SupplierWarrantyClaim',
      entityId: claim.id,
      after: { responseType, messageSummary, nextStatus },
    });

    return { responseRecord, claim: updated };
  }

  /**
   * Resolves a claim by accepting a new Replacement Inventory from the supplier.
   * CASH COST = Rp0 (because supplier replaced it for free!).
   */
  static async resolveReplacement(params: {
    claimId: string;
    newCredentialPayload: string;
    deliveryType?: DeliveryType;
    notes?: string;
    adminUserId: string;
  }) {
    const { claimId, newCredentialPayload, deliveryType, notes, adminUserId } = params;

    return await db.$transaction(
      async (tx) => {
      const claim = await tx.supplierWarrantyClaim.findUnique({
        where: { id: claimId },
      });

      if (!claim) throw new Error('CLAIM_NOT_FOUND');
      if (claim.status === 'CLOSED') throw new Error('CLAIM_ALREADY_CLOSED');

      let newInventoryId: string | null = null;
      let newInventory: any = null;

      if (claim.assetType === 'SHARED_MASTER') {
        // Handle Shared Account Master Replacement
        const origShared = await tx.sharedAccount.findUnique({ where: { id: claim.assetId } });
        const variantId = origShared?.productVariantId || '';
        const variant = await tx.productVariant.findUnique({ where: { id: variantId } });

        const maxSlots = origShared?.maxSlots || variant?.sharedCapacityDefault || 2;
        const slotLabelPrefix = variant?.sharedSlotLabelPrefix || 'USER';
        const credentialEncrypted = JSON.stringify(encryptPayload(newCredentialPayload));

        const labelPrefix = variant?.sku ? variant.sku.toUpperCase() : 'SHARED';
        const existingCount = await tx.sharedAccount.count({ where: { productVariantId: variantId } });
        const nextNum = (existingCount + 1).toString().padStart(3, '0');
        const autoLabel = `${labelPrefix}-${nextNum}`;

        const newSharedAccount = await tx.sharedAccount.create({
          data: {
            productVariantId: variantId,
            label: autoLabel,
            credentialEncrypted,
            maxSlots,
            status: 'AVAILABLE',
            acquisitionCost: 0, // Zero cash acquisition cost!
            supplierId: claim.supplierId,
            supplierReference: `CLAIM-REPLACEMENT:${claim.claimNumber}`,
            sourceType: 'SUPPLIER_WARRANTY_REPLACEMENT',
          },
        });

        const slotsData = [];
        for (let i = 1; i <= maxSlots; i++) {
          slotsData.push({
            sharedAccountId: newSharedAccount.id,
            slotNumber: i,
            slotLabel: `${slotLabelPrefix} ${i}`,
            status: 'AVAILABLE' as any,
          });
        }
        await tx.sharedAccountSlot.createMany({ data: slotsData });

        newInventoryId = newSharedAccount.id;
        newInventory = newSharedAccount;
      } else if (claim.assetType === 'FAMILY_GROUP') {
        // Handle Family Group Replacement
        const origFamily = await tx.familyGroup.findUnique({ where: { id: claim.assetId } });
        const variantId = origFamily?.productVariantId || '';
        const variant = await tx.productVariant.findUnique({ where: { id: variantId } });

        const maxMembers = origFamily?.maxMembers || 5;
        const credentialEncrypted = JSON.stringify(encryptPayload(newCredentialPayload));

        const groupRef = `FAM-${variant?.sku || 'GRP'}-${Date.now().toString().slice(-4)}`;

        const newFamily = await tx.familyGroup.create({
          data: {
            productVariantId: variantId,
            groupReference: groupRef,
            ownerCredentialEncrypted: credentialEncrypted,
            maxMembers,
            status: 'AVAILABLE',
            acquisitionCost: 0, // Zero cash cost!
            supplierId: claim.supplierId,
            supplierReference: `CLAIM-REPLACEMENT:${claim.claimNumber}`,
            sourceType: 'SUPPLIER_WARRANTY_REPLACEMENT',
          },
        });

        const memberSlots = [];
        for (let i = 1; i <= maxMembers; i++) {
          memberSlots.push({
            familyGroupId: newFamily.id,
            slotNumber: i,
            status: 'AVAILABLE' as any,
          });
        }
        await tx.familyMemberSlot.createMany({ data: memberSlots });

        newInventoryId = newFamily.id;
        newInventory = newFamily;
      } else {
        // Default Single Inventory Item Replacement
        const origInventory = await tx.inventoryItem.findUnique({
          where: { id: claim.assetId },
        });

        const variantId = origInventory?.variantId || '';
        const encrypted = encryptPayload(newCredentialPayload);

        newInventory = await tx.inventoryItem.create({
          data: {
            variantId,
            type: deliveryType || origInventory?.type || 'LICENSE_KEY',
            payloadCipher: encrypted.cipher,
            payloadIv: encrypted.iv,
            payloadAuthTag: encrypted.authTag,
            status: 'AVAILABLE',
            supplierId: claim.supplierId,
            sourceType: 'SUPPLIER_WARRANTY_REPLACEMENT',
            costAmount: 0, // Zero cash acquisition cost!
            supplierReference: `CLAIM-REPLACEMENT:${claim.claimNumber}`,
            purchasedAt: new Date(),
          },
        });
        newInventoryId = newInventory.id;
      }

      // 3. Create SupplierRecovery record
      const recovery = await tx.supplierRecovery.create({
        data: {
          claimId,
          supplierId: claim.supplierId,
          type: 'REPLACEMENT',
          amount: claim.claimValue,
          replacementInventoryId: newInventoryId,
          reference: claim.claimNumber,
          createdBy: adminUserId,
        },
      });

      // 4. Close Claim
      const now = new Date();
      const updatedClaim = await tx.supplierWarrantyClaim.update({
        where: { id: claimId },
        data: {
          status: 'CLOSED',
          resolutionType: 'REPLACEMENT',
          resolutionAmount: claim.claimValue,
          resolvedAt: now,
          closedAt: now,
          internalNotes: notes ? `${claim.internalNotes || ''}\n[Resolved Replacement]: ${notes}` : claim.internalNotes,
          updatedBy: adminUserId,
        },
      });

      await AuditService.log({
        actorId: adminUserId,
        action: 'SUPPLIER_REPLACEMENT_RECEIVED',
        entity: 'SupplierWarrantyClaim',
        entityId: claim.id,
        after: { newInventoryId: newInventory.id, recoveryId: recovery.id },
      });

      return { claim: updatedClaim, newInventory, recovery };
    }, { timeout: 30000 });
  }

  /**
   * Resolves a claim via Cash Refund or Supplier Store Credit.
   * Does NOT alter historical inventory COGS history.
   */
  static async resolveRefundOrCredit(params: {
    claimId: string;
    type: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'SUPPLIER_CREDIT';
    amount: number;
    reference?: string;
    notes?: string;
    adminUserId: string;
  }) {
    const { claimId, type, amount, reference, notes, adminUserId } = params;

    return await db.$transaction(async (tx) => {
      const claim = await tx.supplierWarrantyClaim.findUnique({
        where: { id: claimId },
      });

      if (!claim) throw new Error('CLAIM_NOT_FOUND');
      if (claim.status === 'CLOSED') throw new Error('CLAIM_ALREADY_CLOSED');

      const recoveryType: SupplierRecoveryType =
        type === 'SUPPLIER_CREDIT' ? 'SUPPLIER_CREDIT' : type === 'FULL_REFUND' ? 'FULL_REFUND' : 'PARTIAL_REFUND';

      const recovery = await tx.supplierRecovery.create({
        data: {
          claimId,
          supplierId: claim.supplierId,
          type: recoveryType,
          amount,
          reference: reference || claim.claimNumber,
          createdBy: adminUserId,
        },
      });

      const resolutionType: SupplierClaimResolutionType =
        type === 'SUPPLIER_CREDIT' ? 'SUPPLIER_CREDIT' : type === 'FULL_REFUND' ? 'FULL_REFUND' : 'PARTIAL_REFUND';

      const now = new Date();
      const updatedClaim = await tx.supplierWarrantyClaim.update({
        where: { id: claimId },
        data: {
          status: 'CLOSED',
          resolutionType,
          resolutionAmount: amount,
          resolvedAt: now,
          closedAt: now,
          internalNotes: notes ? `${claim.internalNotes || ''}\n[Resolved Refund/Credit]: ${notes}` : claim.internalNotes,
          updatedBy: adminUserId,
        },
      });

      await AuditService.log({
        actorId: adminUserId,
        action: type === 'SUPPLIER_CREDIT' ? 'SUPPLIER_CREDIT_RECEIVED' : 'SUPPLIER_REFUND_RECEIVED',
        entity: 'SupplierWarrantyClaim',
        entityId: claim.id,
        after: { recoveryId: recovery.id, amount, type },
      });

      return { claim: updatedClaim, recovery };
    }, { timeout: 30000 });
  }

  /**
   * Rejects a claim (Supplier refused warranty)
   */
  static async rejectClaim(claimId: string, reason: string, adminUserId: string) {
    const claim = await db.supplierWarrantyClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new Error('CLAIM_NOT_FOUND');

    const now = new Date();
    const updated = await db.supplierWarrantyClaim.update({
      where: { id: claimId },
      data: {
        status: 'CLOSED',
        resolutionType: 'REJECTED',
        resolutionAmount: 0,
        rejectedAt: now,
        closedAt: now,
        internalNotes: `${claim.internalNotes || ''}\n[Rejected]: ${reason}`,
        updatedBy: adminUserId,
      },
    });

    await AuditService.log({
      actorId: adminUserId,
      action: 'SUPPLIER_CLAIM_REJECTED',
      entity: 'SupplierWarrantyClaim',
      entityId: claim.id,
      after: { reason },
    });

    return updated;
  }

  /**
   * Scheduled cron worker to check supplier claim deadline warnings (7d, 3d, 1d)
   */
  static async checkSupplierClaimDeadlines() {
    const activeClaims = await db.supplierWarrantyClaim.findMany({
      where: {
        status: { in: ['DRAFT', 'REVIEW_REQUIRED', 'READY_TO_CLAIM', 'SUBMITTED', 'WAITING_SUPPLIER'] },
        claimDeadlineAt: { not: null },
      },
      include: {
        supplier: { select: { name: true } },
      },
    });

    const now = new Date();
    const admins = await db.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, disabled: false },
      select: { id: true, email: true },
    });

    let notifiedCount = 0;

    for (const claim of activeClaims) {
      if (!claim.claimDeadlineAt) continue;

      const msRemaining = claim.claimDeadlineAt.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 7 && daysRemaining > 0) {
        for (const admin of admins) {
          await NotificationOrchestrator.dispatchEvent({
            userId: admin.id,
            userEmail: admin.email,
            eventType: 'SUPPLIER_CLAIM_DEADLINE_WARNING',
            title: `Peringatan Garansi Supplier #${claim.claimNumber}`,
            message: `Klaim garansi supplier ${claim.supplier?.name} sisa waktu ${daysRemaining} hari. Potensi recovery: Rp${claim.claimValue.toLocaleString('id-ID')}`,
            actionUrl: `/admin/suppliers/claims/${claim.id}`,
            metadata: { claimId: claim.id, daysRemaining, claimValue: claim.claimValue },
            dedupeKey: `CLAIM_DEADLINE_WARN:${claim.id}:${daysRemaining}:${admin.id}`,
          });
          notifiedCount++;
        }
      }
    }

    return { totalActiveClaims: activeClaims.length, notifiedCount };
  }
}
