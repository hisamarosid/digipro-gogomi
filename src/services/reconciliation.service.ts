import { db } from '@/lib/db/prisma';
import { encryptPayload } from '@/lib/security/encryption';
import { AuditService } from './audit.service';
import { SharedAccountStatus, SharedSlotStatus, StockStatus, FamilyGroupStatus } from '../../generated/prisma';

export interface ReconciliationReport {
  scannedAt: string;
  expiredStockRepaired: number;
  fullAccountStatusRepaired: number;
  availableAccountStatusRepaired: number;
  totalInconsistenciesFound: number;
}

export interface InventoryLifecycleAlerts {
  sharedSlotsNeedingRotation: number;
  familySlotsNeedingRotation: number;
  totalAccountsAffected: number;
}

export class InventoryReconciliationService {
  /**
   * Scans all inventory types (Shared, Family, Dedicated) and applies safe deterministic repairs
   */
  static async reconcileSystemInventory(): Promise<ReconciliationReport> {
    const now = new Date();
    let expiredStockRepaired = 0;
    let fullAccountStatusRepaired = 0;
    let availableAccountStatusRepaired = 0;

    // 1. Repair expired dedicated inventory items that are still marked AVAILABLE
    const expiredAvailable = await db.inventoryItem.findMany({
      where: {
        status: StockStatus.AVAILABLE,
        expiresAt: { lte: now },
      },
    });

    if (expiredAvailable.length > 0) {
      const res = await db.inventoryItem.updateMany({
        where: {
          id: { in: expiredAvailable.map((i) => i.id) },
        },
        data: { status: StockStatus.DISABLED },
      });
      expiredStockRepaired += res.count;
    }

    // 2. Quarantine expired shared account slots (move ASSIGNED -> EXPIRED)
    const expiredAssignedSlots = await db.sharedAccountSlot.findMany({
      where: {
        status: SharedSlotStatus.ASSIGNED,
        expiresAt: { lte: now },
      },
    });

    if (expiredAssignedSlots.length > 0) {
      const res = await db.sharedAccountSlot.updateMany({
        where: {
          id: { in: expiredAssignedSlots.map((s) => s.id) },
        },
        data: { status: SharedSlotStatus.EXPIRED },
      });
      expiredStockRepaired += res.count;
    }

    // 3. Quarantine expired family member slots (move ASSIGNED -> EXPIRED)
    const expiredFamilySlots = await db.familyMemberSlot.findMany({
      where: {
        status: SharedSlotStatus.ASSIGNED,
        expiresAt: { lte: now },
      },
    });

    if (expiredFamilySlots.length > 0) {
      const res = await db.familyMemberSlot.updateMany({
        where: {
          id: { in: expiredFamilySlots.map((s) => s.id) },
        },
        data: { status: SharedSlotStatus.EXPIRED },
      });
      expiredStockRepaired += res.count;
    }

    // 4. Reconcile Shared Account status vs Slot availability
    const sharedAccounts = await db.sharedAccount.findMany({
      include: { slots: true },
    });

    for (const acc of sharedAccounts) {
      const availableSlotsCount = acc.slots.filter((s) => s.status === SharedSlotStatus.AVAILABLE).length;

      if (availableSlotsCount === 0 && acc.status === SharedAccountStatus.AVAILABLE) {
        await db.sharedAccount.update({
          where: { id: acc.id },
          data: { status: SharedAccountStatus.FULL },
        });
        fullAccountStatusRepaired++;
      } else if (availableSlotsCount > 0 && acc.status === SharedAccountStatus.FULL) {
        const newStatus = availableSlotsCount === acc.maxSlots ? SharedAccountStatus.AVAILABLE : SharedAccountStatus.PARTIALLY_USED;
        await db.sharedAccount.update({
          where: { id: acc.id },
          data: { status: newStatus },
        });
        availableAccountStatusRepaired++;
      }
    }

    // 5. Reconcile Family Group status vs Member Slot availability
    const familyGroups = await db.familyGroup.findMany({
      include: { members: true },
    });

    for (const group of familyGroups) {
      const availableMembersCount = group.members.filter((m) => m.status === SharedSlotStatus.AVAILABLE).length;

      if (availableMembersCount === 0 && group.status === FamilyGroupStatus.AVAILABLE) {
        await db.familyGroup.update({
          where: { id: group.id },
          data: { status: FamilyGroupStatus.FULL },
        });
        fullAccountStatusRepaired++;
      } else if (availableMembersCount > 0 && group.status === FamilyGroupStatus.FULL) {
        const newStatus = availableMembersCount === group.maxMembers ? FamilyGroupStatus.AVAILABLE : FamilyGroupStatus.PARTIALLY_USED;
        await db.familyGroup.update({
          where: { id: group.id },
          data: { status: newStatus },
        });
        availableAccountStatusRepaired++;
      }
    }

    const totalInconsistenciesFound = expiredStockRepaired + fullAccountStatusRepaired + availableAccountStatusRepaired;

    return {
      scannedAt: now.toISOString(),
      expiredStockRepaired,
      fullAccountStatusRepaired,
      availableAccountStatusRepaired,
      totalInconsistenciesFound,
    };
  }

  /**
   * Rotates master password for a Shared Account and releases selected expired slots to AVAILABLE atomically
   */
  static async rotateSharedAccountPassword(
    accountId: string,
    newCredentialPlain: string,
    slotIdsToRelease: string[],
    actorId: string
  ) {
    return await db.$transaction(async (tx) => {
      const account = await tx.sharedAccount.findUnique({
        where: { id: accountId },
        include: { slots: true, variant: true },
      });

      if (!account) {
        throw new Error('Shared Account tidak ditemukan');
      }

      if (!newCredentialPlain || !newCredentialPlain.trim()) {
        throw new Error('Password / Kredensial baru wajib diisi');
      }

      // 1. Encrypt and update master credential
      const credentialEncrypted = JSON.stringify(encryptPayload(newCredentialPlain.trim()));
      await tx.sharedAccount.update({
        where: { id: accountId },
        data: { credentialEncrypted },
      });

      // 2. Release selected slots back to AVAILABLE cleanly
      if (slotIdsToRelease && slotIdsToRelease.length > 0) {
        await tx.sharedAccountSlot.updateMany({
          where: {
            id: { in: slotIdsToRelease },
            sharedAccountId: accountId,
          },
          data: {
            status: SharedSlotStatus.AVAILABLE,
            assignedUserId: null,
            orderId: null,
            orderItemId: null,
            assignedAt: null,
            activatedAt: null,
            expiresAt: null,
          },
        });
      }

      // 3. Recompute overall account status
      const availableCount = await tx.sharedAccountSlot.count({
        where: {
          sharedAccountId: accountId,
          status: SharedSlotStatus.AVAILABLE,
        },
      });

      const newStatus =
        availableCount === 0
          ? SharedAccountStatus.FULL
          : availableCount < account.maxSlots
          ? SharedAccountStatus.PARTIALLY_USED
          : SharedAccountStatus.AVAILABLE;

      const updated = await tx.sharedAccount.update({
        where: { id: accountId },
        data: { status: newStatus },
        include: {
          slots: { orderBy: { slotNumber: 'asc' }, include: { assignedUser: { select: { id: true, email: true, name: true } } } },
          variant: { include: { product: true } },
          supplier: true,
        },
      });

      // 4. Audit Log
      await AuditService.log({
        actorId,
        action: 'SHARED_ACCOUNT_PASSWORD_ROTATED',
        entity: 'SharedAccount',
        entityId: accountId,
        after: {
          label: account.label,
          slotsReleasedCount: slotIdsToRelease.length,
          newStatus,
        },
      });

      return updated;
    });
  }

  /**
   * Rotates owner credential / invite link for a Family Group and releases selected member slots to AVAILABLE
   */
  static async rotateFamilyGroupOwnerCredential(
    groupId: string,
    newOwnerCredentialPlain: string,
    slotIdsToRelease: string[],
    actorId: string
  ) {
    return await db.$transaction(async (tx) => {
      const group = await tx.familyGroup.findUnique({
        where: { id: groupId },
        include: { members: true, variant: true },
      });

      if (!group) {
        throw new Error('Family Group tidak ditemukan');
      }

      if (!newOwnerCredentialPlain || !newOwnerCredentialPlain.trim()) {
        throw new Error('Owner Kredensial / Link baru wajib diisi');
      }

      // 1. Encrypt and update owner credential
      const ownerCredentialEncrypted = JSON.stringify(encryptPayload(newOwnerCredentialPlain.trim()));
      await tx.familyGroup.update({
        where: { id: groupId },
        data: { ownerCredentialEncrypted },
      });

      // 2. Release selected member slots back to AVAILABLE cleanly
      if (slotIdsToRelease && slotIdsToRelease.length > 0) {
        await tx.familyMemberSlot.updateMany({
          where: {
            id: { in: slotIdsToRelease },
            familyGroupId: groupId,
          },
          data: {
            status: SharedSlotStatus.AVAILABLE,
            userId: null,
            orderId: null,
            orderItemId: null,
            invitedAt: null,
            acceptedAt: null,
            activatedAt: null,
            expiresAt: null,
          },
        });
      }

      // 3. Recompute FamilyGroup status
      const availableCount = await tx.familyMemberSlot.count({
        where: {
          familyGroupId: groupId,
          status: SharedSlotStatus.AVAILABLE,
        },
      });

      const newStatus =
        availableCount === 0
          ? FamilyGroupStatus.FULL
          : availableCount < group.maxMembers
          ? FamilyGroupStatus.PARTIALLY_USED
          : FamilyGroupStatus.AVAILABLE;

      const updated = await tx.familyGroup.update({
        where: { id: groupId },
        data: { status: newStatus },
        include: {
          members: { orderBy: { slotNumber: 'asc' }, include: { user: { select: { id: true, email: true, name: true } } } },
          variant: { include: { product: true } },
          supplier: true,
        },
      });

      // 4. Audit Log
      await AuditService.log({
        actorId,
        action: 'FAMILY_GROUP_CREDENTIAL_ROTATED',
        entity: 'FamilyGroup',
        entityId: groupId,
        after: {
          groupReference: group.groupReference,
          slotsReleasedCount: slotIdsToRelease.length,
          newStatus,
        },
      });

      return updated;
    });
  }

  /**
   * Retrieves summary count of accounts/slots needing password rotation
   */
  static async getInventoryLifecycleAlerts(): Promise<InventoryLifecycleAlerts> {
    const now = new Date();

    const [sharedSlots, familySlots] = await Promise.all([
      db.sharedAccountSlot.count({
        where: {
          status: { in: [SharedSlotStatus.EXPIRED, SharedSlotStatus.ASSIGNED] },
          expiresAt: { lte: now },
          sharedAccount: {
            OR: [
              { masterExpiresAt: null },
              { masterExpiresAt: { gt: now } },
            ],
          },
        },
      }),
      db.familyMemberSlot.count({
        where: {
          status: { in: [SharedSlotStatus.EXPIRED, SharedSlotStatus.ASSIGNED] },
          expiresAt: { lte: now },
          familyGroup: {
            OR: [
              { masterExpiresAt: null },
              { masterExpiresAt: { gt: now } },
            ],
          },
        },
      }),
    ]);

    return {
      sharedSlotsNeedingRotation: sharedSlots,
      familySlotsNeedingRotation: familySlots,
      totalAccountsAffected: sharedSlots + familySlots,
    };
  }
}
