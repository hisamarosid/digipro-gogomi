import { db } from '@/lib/db/prisma';
import {
  WarrantyIneligibilityReason,
  InventoryFailureReason,
} from '../../../generated/prisma';

export interface WarrantyEligibilityResult {
  eligible: boolean;
  policyName?: string;
  warrantyEndsAt?: Date;
  claimDeadlineAt?: Date;
  daysRemaining?: number;
  reason?: WarrantyIneligibilityReason | null;
}

export class SupplierWarrantyEligibilityService {
  /**
   * Checks structured warranty eligibility for an inventory item or shared account
   */
  static async checkWarrantyEligibility(params: {
    supplierId?: string | null;
    purchaseDate?: Date | null;
    failureReason: InventoryFailureReason;
    isCustomerFault?: boolean;
  }): Promise<WarrantyEligibilityResult> {
    const { supplierId, purchaseDate, failureReason, isCustomerFault } = params;

    // 1. Customer fault / non-claimable failure reasons
    const nonClaimableReasons: InventoryFailureReason[] = [
      'CUSTOMER_ERROR',
      'CUSTOMER_MISUSE',
      'CUSTOMER_REQUEST',
      'CONFIGURATION_ERROR_INTERNAL',
      'PLATFORM_ERROR_INTERNAL',
      'UNKNOWN_RESPONSIBILITY',
    ];

    if (isCustomerFault || nonClaimableReasons.includes(failureReason)) {
      return {
        eligible: false,
        reason: 'CUSTOMER_CAUSED_ISSUE',
      };
    }

    // 2. Check Supplier existence
    if (!supplierId) {
      return {
        eligible: false,
        reason: 'NO_SUPPLIER',
      };
    }

    const supplier = await db.supplier.findUnique({
      where: { id: supplierId },
      include: {
        policies: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!supplier || supplier.status === 'ARCHIVED') {
      return {
        eligible: false,
        reason: 'SUPPLIER_ARCHIVED_WITHOUT_SUPPORT',
      };
    }

    const policy = supplier.policies[0];
    const warrantyDays = policy?.warrantyDays || 30;
    const claimDeadlineDays = policy?.claimDeadlineDays || warrantyDays;
    const policyName = policy?.name || 'Kebijakan Garansi Standar (30 Hari)';

    // 3. Calculate Warranty & Claim Deadlines
    const pDate = purchaseDate || supplier.createdAt;

    const warrantyEndsAt = new Date(pDate.getTime() + warrantyDays * 24 * 60 * 60 * 1000);
    const claimDeadlineAt = new Date(pDate.getTime() + claimDeadlineDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    const msRemaining = claimDeadlineAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    if (now > warrantyEndsAt) {
      return {
        eligible: false,
        policyName,
        warrantyEndsAt,
        claimDeadlineAt,
        daysRemaining: 0,
        reason: 'WARRANTY_EXPIRED',
      };
    }

    if (now > claimDeadlineAt) {
      return {
        eligible: false,
        policyName,
        warrantyEndsAt,
        claimDeadlineAt,
        daysRemaining: 0,
        reason: 'CLAIM_DEADLINE_EXPIRED',
      };
    }

    return {
      eligible: true,
      policyName,
      warrantyEndsAt,
      claimDeadlineAt,
      daysRemaining,
      reason: null,
    };
  }
}
