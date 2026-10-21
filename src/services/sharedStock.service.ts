import { db } from '@/lib/db/prisma';
import {
  DeliveryModel,
  SharedAccountStatus,
  SharedSlotStatus,
  FamilyGroupStatus,
  StockStatus,
} from '../../generated/prisma';

export type SharedFulfillmentFailureReason =
  | 'NO_SHARED_ACCOUNT'
  | 'NO_AVAILABLE_SLOT'
  | 'VARIANT_MISMATCH'
  | 'MASTER_EXPIRED'
  | 'MASTER_LIFETIME_INSUFFICIENT'
  | 'DELIVERY_DEADLINE_EXPIRED'
  | 'ALL_SLOTS_RESERVED'
  | 'MASTER_INVALID'
  | 'ALLOCATION_RACE_LOST'
  | 'ALLOCATION_FAILED'
  | 'ENCRYPTION_ERROR'
  | 'UNKNOWN';

export interface SharedAccountCandidateDiagnostic {
  accountId: string;
  label: string;
  status: SharedAccountStatus;
  totalSlots: number;
  availableSlotsCount: number;
  assignedSlotsCount: number;
  masterExpiresAt: Date | null;
  deliveryDeadlineAt: Date | null;
  eligible: boolean;
  rejectionReason?: SharedFulfillmentFailureReason;
  rejectionMessage?: string;
}

export interface SharedInventoryDiagnosticResult {
  variantId: string;
  variantName: string;
  sku: string;
  productName: string;
  deliveryModel: DeliveryModel;
  subscriptionDays: number;
  safetyBufferDays: number;
  requiredRemainingDays: number;
  accountsFound: number;
  totalSlots: number;
  availableSlots: number;
  eligibleSlots: number;
  candidates: SharedAccountCandidateDiagnostic[];
  primaryFailureReason?: SharedFulfillmentFailureReason;
}

export class SharedStockService {
  /**
   * Single Source of Truth: Get full diagnostic details for a Shared Account variant
   */
  static async getSharedInventoryDiagnostics(variantId: string): Promise<SharedInventoryDiagnosticResult> {
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant) {
      throw new Error(`Variant ${variantId} not found`);
    }

    const now = new Date();
    const subscriptionDays = variant.subscriptionDays || 30;
    const safetyBufferDays = variant.sharedSafetyBufferDays || 2;
    const requiredRemainingDays = subscriptionDays + safetyBufferDays;
    const minMasterExpiresAt = new Date(now.getTime() + requiredRemainingDays * 24 * 60 * 60 * 1000);

    // Fetch all Shared Accounts linked to this exact ProductVariant
    const accounts = await db.sharedAccount.findMany({
      where: { productVariantId: variantId },
      include: {
        slots: { orderBy: { slotNumber: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const candidates: SharedAccountCandidateDiagnostic[] = [];
    let totalSlots = 0;
    let availableSlots = 0;
    let eligibleSlots = 0;

    for (const acc of accounts) {
      totalSlots += acc.maxSlots;

      const availableSlotsInAcc = acc.slots.filter((s) => s.status === SharedSlotStatus.AVAILABLE);
      const assignedSlotsInAcc = acc.slots.filter((s) => s.status === SharedSlotStatus.ASSIGNED);

      availableSlots += availableSlotsInAcc.length;

      let eligible = true;
      let rejectionReason: SharedFulfillmentFailureReason | undefined;
      let rejectionMessage: string | undefined;

      // 1. Check account status
      if (acc.status === SharedAccountStatus.INVALID) {
        eligible = false;
        rejectionReason = 'MASTER_INVALID';
        rejectionMessage = 'Status Master Account adalah INVALID (non-aktif)';
      } else if (acc.status === SharedAccountStatus.EXPIRED || acc.status === SharedAccountStatus.DISABLED) {
        eligible = false;
        rejectionReason = 'MASTER_EXPIRED';
        rejectionMessage = 'Status Master Account telah kadaluarsa / non-aktif';
      } else if (availableSlotsInAcc.length === 0) {
        eligible = false;
        rejectionReason = 'NO_AVAILABLE_SLOT';
        rejectionMessage = 'Seluruh slot profil pada master account ini sudah terisi (FULL)';
      } else if (variant.sharedRequireMasterLifetimeCheck && acc.masterExpiresAt) {
        if (acc.masterExpiresAt < now) {
          eligible = false;
          rejectionReason = 'MASTER_EXPIRED';
          rejectionMessage = 'Tanggal kadaluarsa master account sudah lewat';
        } else if (acc.masterExpiresAt < minMasterExpiresAt) {
          eligible = false;
          rejectionReason = 'MASTER_LIFETIME_INSUFFICIENT';
          rejectionMessage = `Sisa masa aktif master account (${acc.masterExpiresAt.toISOString().split('T')[0]}) kurang dari durasi order (${requiredRemainingDays} hari)`;
        }
      } else if (acc.deliveryDeadlineAt && acc.deliveryDeadlineAt <= now) {
        // If unused pre-delivery deadline passed and 0 slots were ever assigned
        if (assignedSlotsInAcc.length === 0) {
          eligible = false;
          rejectionReason = 'DELIVERY_DEADLINE_EXPIRED';
          rejectionMessage = 'Pre-delivery deadline untuk akun baru yang belum dipakai telah lewat';
        }
      }

      if (eligible) {
        eligibleSlots += availableSlotsInAcc.length;
      }

      candidates.push({
        accountId: acc.id,
        label: acc.label,
        status: acc.status,
        totalSlots: acc.maxSlots,
        availableSlotsCount: availableSlotsInAcc.length,
        assignedSlotsCount: assignedSlotsInAcc.length,
        masterExpiresAt: acc.masterExpiresAt,
        deliveryDeadlineAt: acc.deliveryDeadlineAt,
        eligible,
        rejectionReason,
        rejectionMessage,
      });
    }

    // Determine primary failure reason if no eligible slots
    let primaryFailureReason: SharedFulfillmentFailureReason | undefined;
    if (accounts.length === 0) {
      // Check if Shared Accounts exist for the same Product but different Variant
      const siblingAccountsCount = await db.sharedAccount.count({
        where: { variant: { productId: variant.productId } },
      });
      primaryFailureReason = siblingAccountsCount > 0 ? 'VARIANT_MISMATCH' : 'NO_SHARED_ACCOUNT';
    } else if (eligibleSlots === 0) {
      const firstRejected = candidates.find((c) => c.rejectionReason);
      primaryFailureReason = firstRejected?.rejectionReason || 'NO_AVAILABLE_SLOT';
    }

    return {
      variantId,
      variantName: variant.name,
      sku: variant.sku,
      productName: variant.product.name,
      deliveryModel: (variant.deliveryModel as DeliveryModel) || DeliveryModel.SHARED_ACCOUNT,
      subscriptionDays,
      safetyBufferDays,
      requiredRemainingDays,
      accountsFound: accounts.length,
      totalSlots,
      availableSlots,
      eligibleSlots,
      candidates,
      primaryFailureReason,
    };
  }

  /**
   * Returns count of eligible available slots for storefront stock display
   */
  static async countEligibleSharedSlots(variantId: string): Promise<number> {
    const diag = await this.getSharedInventoryDiagnostics(variantId);
    return diag.eligibleSlots;
  }

  /**
   * Finds the best eligible SharedAccount candidate for allocation
   */
  static async findEligibleSharedAccount(variantId: string) {
    const diag = await this.getSharedInventoryDiagnostics(variantId);
    const eligibleCandidates = diag.candidates.filter((c) => c.eligible && c.availableSlotsCount > 0);

    if (eligibleCandidates.length === 0) return null;

    // Sort: PARTIALLY_USED first (assignedSlotsCount > 0), earliest safe master expiry, oldest created
    eligibleCandidates.sort((a, b) => {
      if (a.assignedSlotsCount > 0 && b.assignedSlotsCount === 0) return -1;
      if (b.assignedSlotsCount > 0 && a.assignedSlotsCount === 0) return 1;

      if (a.masterExpiresAt && b.masterExpiresAt) {
        return a.masterExpiresAt.getTime() - b.masterExpiresAt.getTime();
      }

      return 0;
    });

    const chosen = eligibleCandidates[0];
    return await db.sharedAccount.findUnique({
      where: { id: chosen.accountId },
      include: {
        slots: {
          where: { status: SharedSlotStatus.AVAILABLE },
          orderBy: { slotNumber: 'asc' },
        },
      },
    });
  }

  /**
   * Universal Stock Calculation routing across all DeliveryModels (Single Variant)
   */
  static async getAvailableStockForVariant(variantId: string): Promise<number> {
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, active: true, deliveryModel: true, subscriptionDays: true, sharedSafetyBufferDays: true },
    });

    if (!variant || !variant.active) return 0;

    const stockMap = await this.batchGetAvailableStock([variant]);
    return stockMap.get(variantId) || 0;
  }

  /**
   * Batch Stock Calculation routing across all DeliveryModels in a single/batched DB pass
   */
  static async batchGetAvailableStock(
    variants: Array<{
      id: string;
      active?: boolean;
      deliveryModel?: DeliveryModel | string | null;
      subscriptionDays?: number | null;
      sharedSafetyBufferDays?: number | null;
      sharedRequireMasterLifetimeCheck?: boolean | null;
    }>
  ): Promise<Map<string, number>> {
    const stockMap = new Map<string, number>();
    if (!variants || variants.length === 0) return stockMap;

    const now = new Date();
    const inventoryVariantIds: string[] = [];
    const sharedVariants: typeof variants = [];
    const familyVariants: typeof variants = [];

    for (const v of variants) {
      if (v.active === false) {
        stockMap.set(v.id, 0);
        continue;
      }

      const model = (v.deliveryModel as DeliveryModel) || DeliveryModel.DEDICATED_ACCOUNT;

      if (model === DeliveryModel.DOWNLOAD || model === DeliveryModel.MANUAL) {
        stockMap.set(v.id, 999);
      } else if (model === DeliveryModel.SHARED_ACCOUNT) {
        sharedVariants.push(v);
      } else if (model === DeliveryModel.FAMILY_MEMBER) {
        familyVariants.push(v);
      } else {
        inventoryVariantIds.push(v.id);
      }
    }

    const queries: Promise<any>[] = [];

    // 1. Batch inventory items (Dedicated Accounts & License Keys)
    if (inventoryVariantIds.length > 0) {
      queries.push(
        db.inventoryItem
          .groupBy({
            by: ['variantId'],
            where: {
              variantId: { in: inventoryVariantIds },
              status: StockStatus.AVAILABLE,
            },
            _count: { id: true },
          })
          .then((groups) => {
            const counts = new Map(groups.map((g) => [g.variantId, g._count.id]));
            for (const id of inventoryVariantIds) {
              stockMap.set(id, counts.get(id) || 0);
            }
          })
      );
    }

    // 2. Batch Shared Accounts
    if (sharedVariants.length > 0) {
      const sharedIds = sharedVariants.map((v) => v.id);
      queries.push(
        db.sharedAccount
          .findMany({
            where: {
              productVariantId: { in: sharedIds },
              status: { in: [SharedAccountStatus.AVAILABLE, SharedAccountStatus.PARTIALLY_USED] },
            },
            select: {
              id: true,
              productVariantId: true,
              masterExpiresAt: true,
              deliveryDeadlineAt: true,
              slots: {
                where: { status: SharedSlotStatus.AVAILABLE },
                select: { id: true },
              },
            },
          })
          .then((accounts) => {
            const variantAccountsMap = new Map<string, typeof accounts>();
            for (const acc of accounts) {
              const list = variantAccountsMap.get(acc.productVariantId) || [];
              list.push(acc);
              variantAccountsMap.set(acc.productVariantId, list);
            }

            for (const v of sharedVariants) {
              const accs = variantAccountsMap.get(v.id) || [];
              const subscriptionDays = v.subscriptionDays || 30;
              const safetyBufferDays = v.sharedSafetyBufferDays || 2;
              const requiredRemainingDays = subscriptionDays + safetyBufferDays;
              const minMasterExpiresAt = new Date(now.getTime() + requiredRemainingDays * 24 * 60 * 60 * 1000);
              const requireLifetime = v.sharedRequireMasterLifetimeCheck !== false;

              let eligibleSlotsCount = 0;
              for (const acc of accs) {
                if (acc.masterExpiresAt && acc.masterExpiresAt < now) {
                  continue;
                }
                if (requireLifetime && acc.masterExpiresAt && acc.masterExpiresAt < minMasterExpiresAt) {
                  continue;
                }
                if (acc.deliveryDeadlineAt && acc.deliveryDeadlineAt <= now) {
                  continue;
                }
                eligibleSlotsCount += acc.slots.length;
              }

              stockMap.set(v.id, eligibleSlotsCount);
            }
          })
      );
    }

    // 3. Batch Family Groups
    if (familyVariants.length > 0) {
      const familyIds = familyVariants.map((v) => v.id);
      queries.push(
        db.familyGroup
          .findMany({
            where: {
              productVariantId: { in: familyIds },
              status: { in: [FamilyGroupStatus.AVAILABLE, FamilyGroupStatus.PARTIALLY_USED] },
            },
            select: {
              productVariantId: true,
              members: {
                where: { status: SharedSlotStatus.AVAILABLE },
                select: { id: true },
              },
            },
          })
          .then((groups) => {
            const counts = new Map<string, number>();
            for (const g of groups) {
              counts.set(g.productVariantId, (counts.get(g.productVariantId) || 0) + g.members.length);
            }
            for (const v of familyVariants) {
              stockMap.set(v.id, counts.get(v.id) || 0);
            }
          })
      );
    }

    await Promise.all(queries);
    return stockMap;
  }
}
