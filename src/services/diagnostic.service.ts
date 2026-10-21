import { db } from '@/lib/db/prisma';
import { DeliveryModel, ErrorCategory, SharedAccountStatus, SharedSlotStatus } from '../../generated/prisma';

export const DIAGNOSTIC_CODES = {
  NO_AVAILABLE_INVENTORY: 'NO_AVAILABLE_INVENTORY',
  NO_AVAILABLE_SHARED_SLOT: 'NO_AVAILABLE_SHARED_SLOT',
  NO_AVAILABLE_FAMILY_SLOT: 'NO_AVAILABLE_FAMILY_SLOT',
  VARIANT_MISMATCH: 'VARIANT_MISMATCH',
  DELIVERY_MODEL_MISMATCH: 'DELIVERY_MODEL_MISMATCH',
  MASTER_EXPIRED: 'MASTER_EXPIRED',
  MASTER_INVALID: 'MASTER_INVALID',
  MASTER_LIFETIME_INSUFFICIENT: 'MASTER_LIFETIME_INSUFFICIENT',
  DELIVERY_DEADLINE_EXPIRED: 'DELIVERY_DEADLINE_EXPIRED',
  INVENTORY_EXPIRED: 'INVENTORY_EXPIRED',
  INVENTORY_INVALID: 'INVENTORY_INVALID',
  INVENTORY_DISABLED: 'INVENTORY_DISABLED',
  ALL_INVENTORY_RESERVED: 'ALL_INVENTORY_RESERVED',
  ALL_SLOTS_RESERVED: 'ALL_SLOTS_RESERVED',
  ALLOCATION_RACE_LOST: 'ALLOCATION_RACE_LOST',
  ALLOCATION_FAILED: 'ALLOCATION_FAILED',
  FULFILLMENT_ALREADY_EXISTS: 'FULFILLMENT_ALREADY_EXISTS',
  MANUAL_FULFILLMENT_REQUIRED: 'MANUAL_FULFILLMENT_REQUIRED',
  CONFIGURATION_INVALID: 'CONFIGURATION_INVALID',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  DOWNLOAD_ASSET_UNAVAILABLE: 'DOWNLOAD_ASSET_UNAVAILABLE',
  UNKNOWN: 'UNKNOWN',
} as const;

export type DiagnosticCode = keyof typeof DIAGNOSTIC_CODES;

export interface RejectedCandidate {
  id: string;
  reference: string;
  reasonCode: string;
  reasonMessage: string;
  details?: Record<string, any>;
}

export interface FulfillmentDiagnosticResult {
  success: boolean;
  code: string;
  category: ErrorCategory;
  message: string;
  technicalDetails?: string;
  totalCandidatesChecked?: number;
  eligibleCandidatesCount?: number;
  rejectedCandidates?: RejectedCandidate[];
  timestamp: string;
}

export class FulfillmentDiagnosticService {
  /**
   * Classifies error code into error category
   */
  static classifyErrorCategory(code: string): ErrorCategory {
    switch (code) {
      case DIAGNOSTIC_CODES.ALLOCATION_RACE_LOST:
      case DIAGNOSTIC_CODES.ALLOCATION_FAILED:
      case 'DATABASE_TRANSIENT_ERROR':
      case 'LOCK_TIMEOUT':
        return ErrorCategory.RETRYABLE;

      case DIAGNOSTIC_CODES.NO_AVAILABLE_INVENTORY:
      case DIAGNOSTIC_CODES.NO_AVAILABLE_SHARED_SLOT:
      case DIAGNOSTIC_CODES.NO_AVAILABLE_FAMILY_SLOT:
      case DIAGNOSTIC_CODES.MASTER_LIFETIME_INSUFFICIENT:
      case DIAGNOSTIC_CODES.ALL_INVENTORY_RESERVED:
      case DIAGNOSTIC_CODES.ALL_SLOTS_RESERVED:
        return ErrorCategory.WAITING_RESOURCE;

      case DIAGNOSTIC_CODES.MANUAL_FULFILLMENT_REQUIRED:
      case 'FAMILY_INVITE_MANUAL':
        return ErrorCategory.MANUAL_REQUIRED;

      case DIAGNOSTIC_CODES.VARIANT_MISMATCH:
      case DIAGNOSTIC_CODES.DELIVERY_MODEL_MISMATCH:
      case DIAGNOSTIC_CODES.CONFIGURATION_INVALID:
      case DIAGNOSTIC_CODES.MASTER_EXPIRED:
      case DIAGNOSTIC_CODES.MASTER_INVALID:
        return ErrorCategory.PERMANENT;

      default:
        return ErrorCategory.PERMANENT;
    }
  }

  /**
   * Evaluates diagnostic breakdown for a product variant fulfillment
   */
  static async diagnoseVariantFulfillment(variantId: string): Promise<FulfillmentDiagnosticResult> {
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant) {
      return {
        success: false,
        code: DIAGNOSTIC_CODES.CONFIGURATION_INVALID,
        category: ErrorCategory.PERMANENT,
        message: 'Product variant configuration not found',
        timestamp: new Date().toISOString(),
      };
    }

    const deliveryModel = variant.deliveryModel as DeliveryModel;

    if (deliveryModel === DeliveryModel.DEDICATED_ACCOUNT || deliveryModel === DeliveryModel.LICENSE_KEY) {
      return this.diagnoseDedicatedInventory(variantId, variant);
    } else if (deliveryModel === DeliveryModel.SHARED_ACCOUNT) {
      return this.diagnoseSharedAccount(variantId, variant);
    } else if (deliveryModel === DeliveryModel.FAMILY_MEMBER) {
      return this.diagnoseFamilyGroup(variantId, variant);
    } else if (deliveryModel === DeliveryModel.MANUAL) {
      return {
        success: true,
        code: DIAGNOSTIC_CODES.MANUAL_FULFILLMENT_REQUIRED,
        category: ErrorCategory.MANUAL_REQUIRED,
        message: 'Produk memerlukan tindakan fulfillment manual oleh tim support',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      code: 'DELIVERY_READY',
      category: ErrorCategory.RETRYABLE,
      message: 'Product strategy is ready for fulfillment',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detailed diagnostic for Dedicated Account / License Key
   */
  private static async diagnoseDedicatedInventory(variantId: string, variant: any): Promise<FulfillmentDiagnosticResult> {
    const items = await db.inventoryItem.findMany({
      where: { variantId: variantId },
    });

    const totalCandidatesChecked = items.length;
    const rejectedCandidates: RejectedCandidate[] = [];
    let eligibleCount = 0;

    const now = new Date();

    for (const item of items) {
      if (item.status === 'SOLD' || item.status === 'ASSIGNED') {
        rejectedCandidates.push({
          id: item.id,
          reference: item.payloadCipher ? `Item #${item.id.slice(-6)}` : 'Inventory',
          reasonCode: 'ITEM_ALREADY_SOLD',
          reasonMessage: 'Inventory item already sold or assigned',
        });
        continue;
      }
      if (item.status === 'DISABLED' || item.status === 'INVALID') {
        rejectedCandidates.push({
          id: item.id,
          reference: `Item #${item.id.slice(-6)}`,
          reasonCode: DIAGNOSTIC_CODES.INVENTORY_DISABLED,
          reasonMessage: 'Inventory item disabled or flagged invalid by admin',
        });
        continue;
      }
      if (item.status === 'RESERVED') {
        rejectedCandidates.push({
          id: item.id,
          reference: `Item #${item.id.slice(-6)}`,
          reasonCode: DIAGNOSTIC_CODES.ALL_INVENTORY_RESERVED,
          reasonMessage: 'Inventory item currently held by active checkout reservation',
        });
        continue;
      }
      if (item.expiresAt && item.expiresAt <= now) {
        rejectedCandidates.push({
          id: item.id,
          reference: `Item #${item.id.slice(-6)}`,
          reasonCode: DIAGNOSTIC_CODES.INVENTORY_EXPIRED,
          reasonMessage: `Credential expired on ${item.expiresAt.toISOString()}`,
        });
        continue;
      }

      eligibleCount++;
    }

    if (eligibleCount > 0) {
      return {
        success: true,
        code: 'ELIGIBLE_STOCK_AVAILABLE',
        category: ErrorCategory.RETRYABLE,
        message: `Tersedia ${eligibleCount} unit stok eligible`,
        totalCandidatesChecked,
        eligibleCandidatesCount: eligibleCount,
        rejectedCandidates,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: false,
      code: totalCandidatesChecked === 0 ? DIAGNOSTIC_CODES.NO_AVAILABLE_INVENTORY : DIAGNOSTIC_CODES.INVENTORY_EXPIRED,
      category: ErrorCategory.WAITING_RESOURCE,
      message: totalCandidatesChecked === 0 ? 'Stok inventory kosong' : 'Semua unit inventory tidak eligible (kadaluarsa/reserved)',
      totalCandidatesChecked,
      eligibleCandidatesCount: 0,
      rejectedCandidates,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detailed diagnostic for Shared Account & Slots
   */
  private static async diagnoseSharedAccount(variantId: string, variant: any): Promise<FulfillmentDiagnosticResult> {
    const accounts = await db.sharedAccount.findMany({
      where: { productVariantId: variantId },
      include: { slots: true },
    });

    const totalCandidatesChecked = accounts.length;
    const rejectedCandidates: RejectedCandidate[] = [];
    let eligibleCount = 0;

    const now = new Date();
    const requiredDays = variant.subscriptionDays || variant.warrantyDays || 30;
    const requiredMs = requiredDays * 24 * 60 * 60 * 1000;

    for (const acc of accounts) {
      if (acc.status === SharedAccountStatus.INVALID || acc.status === SharedAccountStatus.DISABLED) {
        rejectedCandidates.push({
          id: acc.id,
          reference: acc.label,
          reasonCode: DIAGNOSTIC_CODES.MASTER_INVALID,
          reasonMessage: 'Akun Master dinonaktifkan atau ditandai INVALID',
        });
        continue;
      }
      if (acc.status === SharedAccountStatus.FULL) {
        rejectedCandidates.push({
          id: acc.id,
          reference: acc.label,
          reasonCode: 'MASTER_FULL',
          reasonMessage: `Seluruh ${acc.maxSlots} slot telah terisi penuh`,
        });
        continue;
      }
      if (acc.masterExpiresAt && acc.masterExpiresAt <= now) {
        rejectedCandidates.push({
          id: acc.id,
          reference: acc.label,
          reasonCode: DIAGNOSTIC_CODES.MASTER_EXPIRED,
          reasonMessage: `Masa aktif master telah kadaluarsa pada ${acc.masterExpiresAt.toISOString()}`,
        });
        continue;
      }
      if (acc.masterExpiresAt) {
        const remainingLifetimeMs = acc.masterExpiresAt.getTime() - now.getTime();
        if (remainingLifetimeMs < requiredMs) {
          const remainingDays = Math.max(0, Math.floor(remainingLifetimeMs / (1000 * 60 * 60 * 24)));
          rejectedCandidates.push({
            id: acc.id,
            reference: acc.label,
            reasonCode: DIAGNOSTIC_CODES.MASTER_LIFETIME_INSUFFICIENT,
            reasonMessage: `Sisa masa aktif master (${remainingDays} hari) kurang dari garansi paket (${requiredDays} hari)`,
            details: { remainingDays, requiredDays, masterExpiresAt: acc.masterExpiresAt },
          });
          continue;
        }
      }

      const availableSlot = acc.slots.find((s) => s.status === SharedSlotStatus.AVAILABLE);
      if (!availableSlot) {
        rejectedCandidates.push({
          id: acc.id,
          reference: acc.label,
          reasonCode: DIAGNOSTIC_CODES.NO_AVAILABLE_SHARED_SLOT,
          reasonMessage: 'Tidak ada slot berstatus AVAILABLE pada akun master ini',
        });
        continue;
      }

      eligibleCount++;
    }

    if (eligibleCount > 0) {
      return {
        success: true,
        code: 'ELIGIBLE_SHARED_SLOT_AVAILABLE',
        category: ErrorCategory.RETRYABLE,
        message: `Tersedia ${eligibleCount} akun master shared yang eligible`,
        totalCandidatesChecked,
        eligibleCandidatesCount: eligibleCount,
        rejectedCandidates,
        timestamp: new Date().toISOString(),
      };
    }

    const primaryReasonCode = rejectedCandidates.length > 0 ? rejectedCandidates[0].reasonCode : DIAGNOSTIC_CODES.NO_AVAILABLE_SHARED_SLOT;

    return {
      success: false,
      code: primaryReasonCode,
      category: ErrorCategory.WAITING_RESOURCE,
      message: `Fulfillment tertunda: ${rejectedCandidates.map((c) => `${c.reference} (${c.reasonMessage})`).join('; ') || 'Stok slot shared tidak tersedia'}`,
      totalCandidatesChecked,
      eligibleCandidatesCount: 0,
      rejectedCandidates,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detailed diagnostic for Family Group & Seats
   */
  private static async diagnoseFamilyGroup(variantId: string, variant: any): Promise<FulfillmentDiagnosticResult> {
    const groups = await db.familyGroup.findMany({
      where: { productVariantId: variantId },
      include: { members: true },
    });

    const totalCandidatesChecked = groups.length;
    const rejectedCandidates: RejectedCandidate[] = [];
    let eligibleCount = 0;

    const now = new Date();
    const requiredDays = variant.subscriptionDays || variant.warrantyDays || 30;
    const requiredMs = requiredDays * 24 * 60 * 60 * 1000;

    for (const grp of groups) {
      if (grp.status === 'INVALID' || grp.status === 'DISABLED') {
        rejectedCandidates.push({
          id: grp.id,
          reference: grp.groupReference,
          reasonCode: DIAGNOSTIC_CODES.MASTER_INVALID,
          reasonMessage: 'Grup family dinonaktifkan atau ditandai INVALID',
        });
        continue;
      }
      if (grp.masterExpiresAt && grp.masterExpiresAt <= now) {
        rejectedCandidates.push({
          id: grp.id,
          reference: grp.groupReference,
          reasonCode: DIAGNOSTIC_CODES.MASTER_EXPIRED,
          reasonMessage: `Masa aktif grup family kadaluarsa pada ${grp.masterExpiresAt.toISOString()}`,
        });
        continue;
      }
      if (grp.masterExpiresAt) {
        const remainingLifetimeMs = grp.masterExpiresAt.getTime() - now.getTime();
        if (remainingLifetimeMs < requiredMs) {
          const remainingDays = Math.max(0, Math.floor(remainingLifetimeMs / (1000 * 60 * 60 * 24)));
          rejectedCandidates.push({
            id: grp.id,
            reference: grp.groupReference,
            reasonCode: DIAGNOSTIC_CODES.MASTER_LIFETIME_INSUFFICIENT,
            reasonMessage: `Sisa masa aktif family (${remainingDays} hari) kurang dari garansi paket (${requiredDays} hari)`,
          });
          continue;
        }
      }

      const availableSeat = grp.members.find((m) => m.status === SharedSlotStatus.AVAILABLE);
      if (!availableSeat) {
        rejectedCandidates.push({
          id: grp.id,
          reference: grp.groupReference,
          reasonCode: DIAGNOSTIC_CODES.NO_AVAILABLE_FAMILY_SLOT,
          reasonMessage: 'Seluruh seat anggota family grup ini telah terisi',
        });
        continue;
      }

      eligibleCount++;
    }

    if (eligibleCount > 0) {
      return {
        success: true,
        code: 'ELIGIBLE_FAMILY_SLOT_AVAILABLE',
        category: ErrorCategory.RETRYABLE,
        message: `Tersedia ${eligibleCount} grup family yang eligible`,
        totalCandidatesChecked,
        eligibleCandidatesCount: eligibleCount,
        rejectedCandidates,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: false,
      code: rejectedCandidates.length > 0 ? rejectedCandidates[0].reasonCode : DIAGNOSTIC_CODES.NO_AVAILABLE_FAMILY_SLOT,
      category: ErrorCategory.WAITING_RESOURCE,
      message: 'Fulfillment family member tertunda: stok seat family tidak tersedia atau tidak eligible',
      totalCandidatesChecked,
      eligibleCandidatesCount: 0,
      rejectedCandidates,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Sanitizes diagnostic data to ensure credentials and secrets are never exposed
   */
  static sanitizeDiagnosticSnapshot(data: any): string {
    if (!data) return JSON.stringify({});
    const safeData = JSON.parse(JSON.stringify(data));
    delete safeData.password;
    delete safeData.credentialEncrypted;
    delete safeData.pinEncrypted;
    delete safeData.ownerCredentialEncrypted;
    delete safeData.apiKey;
    return JSON.stringify(safeData);
  }
}
