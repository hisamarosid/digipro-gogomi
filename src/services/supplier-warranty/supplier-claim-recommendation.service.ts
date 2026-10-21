import { db } from '@/lib/db/prisma';
import { SupplierWarrantyEligibilityService } from './supplier-warranty-eligibility.service';
import { NotificationOrchestrator } from '@/services/email/email-orchestrator';
import {
  InventoryAssetType,
  InventoryFailureReason,
  SupplierWarrantyClaimStatus,
} from '../../../generated/prisma';

export interface RecommendSupplierClaimRequest {
  replacementId?: string;
  inventoryId?: string;
  sharedAccountId?: string;
  familyGroupId?: string;
  assetType?: InventoryAssetType;
  failureReason?: InventoryFailureReason;
  description?: string;
}

export class SupplierClaimRecommendationService {
  /**
   * Generates sequential claim number (e.g. SC-20260815-0001)
   */
  static async generateClaimNumber(): Promise<string> {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await db.supplierWarrantyClaim.count({
      where: {
        claimNumber: { startsWith: `SC-${todayStr}` },
      },
    });
    const seq = (count + 1).toString().padStart(4, '0');
    return `SC-${todayStr}-${seq}`;
  }

  /**
   * Main recommendation trigger when an old inventory item, shared account, or family group is marked broken
   */
  static async evaluateAndRecommendClaim(
    req: RecommendSupplierClaimRequest
  ): Promise<any | null> {
    const { replacementId, inventoryId, sharedAccountId, familyGroupId, failureReason = 'ACCOUNT_DISABLED', description } = req;

    let targetAsset: any = null;
    let assetType: InventoryAssetType = req.assetType || 'DEDICATED_INVENTORY';
    let replacement: any = null;

    if (replacementId) {
      replacement = await db.replacementRequest.findUnique({
        where: { id: replacementId },
        include: {
          previousInventoryItem: true,
        },
      });
      if (replacement?.previousInventoryItem) {
        targetAsset = replacement.previousInventoryItem;
        assetType = 'DEDICATED_INVENTORY';
      }
    }

    if (!targetAsset && inventoryId) {
      targetAsset = await db.inventoryItem.findUnique({
        where: { id: inventoryId },
      });
      if (targetAsset) assetType = 'DEDICATED_INVENTORY';
    }

    if (!targetAsset && (sharedAccountId || req.assetType === 'SHARED_MASTER')) {
      const targetId = sharedAccountId || inventoryId;
      if (targetId) {
        targetAsset = await db.sharedAccount.findUnique({
          where: { id: targetId },
        });
        if (targetAsset) assetType = 'SHARED_MASTER';
      }
    }

    if (!targetAsset && (familyGroupId || req.assetType === 'FAMILY_GROUP')) {
      const targetId = familyGroupId || inventoryId;
      if (targetId) {
        targetAsset = await db.familyGroup.findUnique({
          where: { id: targetId },
        });
        if (targetAsset) assetType = 'FAMILY_GROUP';
      }
    }

    if (!targetAsset) {
      return null;
    }

    const supplierId = targetAsset.supplierId;

    if (!supplierId) {
      console.log(`[SupplierClaimRecommendation] Asset ${targetAsset.id} has no supplierId assigned. Skipping auto claim.`);
      return null;
    }

    // 1. Evaluate Warranty Eligibility
    const eligibility = await SupplierWarrantyEligibilityService.checkWarrantyEligibility({
      supplierId,
      purchaseDate: targetAsset.purchasedAt || targetAsset.createdAt,
      failureReason,
    });

    if (!eligibility.eligible) {
      console.log(`[SupplierClaimRecommendation] Asset ${targetAsset.id} is not eligible for supplier warranty. Reason: ${eligibility.reason}`);
      return null;
    }

    // 2. CRITICAL DEDUPLICATION RULE: 1 Asset Failure = 1 Active Claim
    const assetId = targetAsset.id;

    const existingActiveClaim = await db.supplierWarrantyClaim.findFirst({
      where: {
        assetType,
        assetId,
        status: {
          notIn: ['CLOSED', 'CANCELLED', 'REJECTED'],
        },
      },
    });

    // If an active claim already exists, link this customer replacement to the existing claim
    if (existingActiveClaim) {
      if (replacementId) {
        await db.supplierClaimReplacementLink.upsert({
          where: {
            claimId_replacementId: {
              claimId: existingActiveClaim.id,
              replacementId,
            },
          },
          create: {
            claimId: existingActiveClaim.id,
            replacementId,
          },
          update: {},
        });
      }
      return existingActiveClaim;
    }

    // 3. Create InventoryFailureIncident
    const incident = await db.inventoryFailureIncident.create({
      data: {
        assetType,
        assetId,
        failureReason,
        description: description || `Auto detected from customer replacement #${replacementId || 'N/A'}`,
        supplierId,
        supplierClaimEligible: true,
      },
    });

    // 4. Create SupplierWarrantyClaim in DRAFT / READY_TO_CLAIM status (NEVER AUTO-SUBMITTED)
    const claimNumber = await this.generateClaimNumber();
    const claimValue = targetAsset.costAmount || targetAsset.acquisitionCost || 0;

    const supplier = await db.supplier.findUnique({
      where: { id: supplierId },
      select: { name: true },
    });

    const claim = await db.supplierWarrantyClaim.create({
      data: {
        claimNumber,
        supplierId,
        sourceType: replacementId ? 'CUSTOMER_REPLACEMENT' : 'INVENTORY_HEALTH_CHECK',
        assetType,
        assetId,
        incidentId: incident.id,
        relatedReplacementId: replacementId || null,
        status: 'READY_TO_CLAIM',
        failureReason,
        failureDescription: description || `Stok lisensi bermasalah (${failureReason})`,
        warrantyEligibility: true,
        warrantyEndsAt: eligibility.warrantyEndsAt,
        claimDeadlineAt: eligibility.claimDeadlineAt,
        claimValue,
        supplierNameSnapshot: supplier?.name || 'External Supplier',
        warrantyPolicyNameSnapshot: eligibility.policyName || 'Standard Policy',
        claimValueSnapshot: claimValue,
      },
    });

    // Link replacement to claim
    if (replacementId) {
      await db.supplierClaimReplacementLink.create({
        data: {
          claimId: claim.id,
          replacementId,
        },
      });
    }

    // 5. Notify Admin via In-App Notification (Admin Only, ZERO customer notifications)
    try {
      const admins = await db.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, disabled: false },
        select: { id: true, email: true },
      });

      for (const admin of admins) {
        await NotificationOrchestrator.dispatchEvent({
          userId: admin.id,
          userEmail: admin.email,
          eventType: 'SUPPLIER_CLAIM_RECOMMENDED',
          title: `Rekomendasi Klaim Garansi Supplier #${claimNumber}`,
          message: `Stok lisensi ID ${assetId.substring(0, 8)}... bermasalah. Potensi klaim: Rp${claimValue.toLocaleString('id-ID')}`,
          actionUrl: `/admin/suppliers/claims/${claim.id}`,
          metadata: {
            claimNumber,
            claimId: claim.id,
            supplierId,
            claimValue,
          },
          dedupeKey: `SUPPLIER_CLAIM_REC:${claim.id}:${admin.id}`,
        });
      }
    } catch (err) {
      console.error('Error sending supplier claim notification:', err);
    }

    return claim;
  }
}
