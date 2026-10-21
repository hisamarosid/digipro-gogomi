import { db } from '@/lib/db/prisma';
import {
  SharedAccountStatus,
  FamilyGroupStatus,
  SharedSlotStatus,
  FulfillmentStatus,
  CustomerNotificationCategory,
} from '../../generated/prisma';
import { SharedAccountService } from './sharedAccount.service';
import { FamilyGroupService } from './familyGroup.service';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { TelegramService } from './telegram.service';
import { SupplierClaimRecommendationService } from './supplier-warranty/supplier-claim-recommendation.service';

export interface MassReplacementResult {
  totalImpacted: number;
  replacedCount: number;
  waitingStockCount: number;
  details: Array<{
    slotId: string;
    orderItemId: string;
    userId: string | null;
    status: 'REPLACED' | 'WAITING_STOCK';
    newSlotId?: string;
  }>;
}

export class MassReplacementService {
  /**
   * Admin action: Marks a SharedAccount as INVALID and executes mass replacement for impacted active customer slots
   */
  static async invalidateMasterAndReplace(
    sharedAccountId: string,
    adminUserId: string,
    reason: string = 'MASTER_ACCOUNT_INVALID'
  ): Promise<MassReplacementResult> {
    const account = await db.sharedAccount.findUnique({
      where: { id: sharedAccountId },
      include: {
        variant: { include: { product: true } },
        slots: {
          where: { status: SharedSlotStatus.ASSIGNED },
          include: { orderItem: true },
        },
      },
    });

    if (!account) {
      throw new Error(`SharedAccount ${sharedAccountId} not found`);
    }

    const now = new Date();

    // 1. Mark SharedAccount as INVALID
    await db.sharedAccount.update({
      where: { id: sharedAccountId },
      data: {
        status: SharedAccountStatus.INVALID,
        invalidatedAt: now,
        invalidationReason: reason,
      },
    });

    // Evaluate Supplier Warranty Claim Recommendation
    if (account.supplierId) {
      SupplierClaimRecommendationService.evaluateAndRecommendClaim({
        sharedAccountId: account.id,
        assetType: 'SHARED_MASTER',
        failureReason: 'ACCOUNT_DISABLED',
        description: `Master Account ${account.label} dinonaktifkan (${reason})`,
      }).catch((err) => console.error('[SupplierClaimRecommendation Error]:', err));
    }

    // Dispatch Telegram Alert
    TelegramService.sendSharedMasterInvalidNotification({
      accountId: account.id,
      label: account.label,
      productName: account.variant?.product?.name || 'Shared Account',
      variantName: account.variant?.name,
      affectedSlots: account.slots.filter((s) => s.orderItemId).length,
      reason,
    }).catch(() => {});

    const activeSlots = account.slots;
    const details: MassReplacementResult['details'] = [];
    let replacedCount = 0;
    let waitingStockCount = 0;

    // 2. Iterate through each impacted customer slot
    for (const oldSlot of activeSlots) {
      if (!oldSlot.orderItemId) continue;

      // Mark old slot as INVALID / REPLACED
      await db.sharedAccountSlot.update({
        where: { id: oldSlot.id },
        data: {
          status: SharedSlotStatus.INVALID,
          replacedAt: now,
        },
      });

      // Mark current fulfillment as INVALID / REVOKED
      await db.fulfillment.updateMany({
        where: {
          orderItemId: oldSlot.orderItemId,
          sharedAccountSlotId: oldSlot.id,
        },
        data: {
          status: FulfillmentStatus.REVOKED,
        },
      });

      // Try to allocate replacement slot from another eligible SharedAccount
      const allocationResult = await db.$transaction(async (tx) => {
        return await SharedAccountService.allocateSlotTx(
          tx,
          account.productVariantId,
          oldSlot.orderItemId!,
          oldSlot.assignedUserId || undefined
        );
      });

      if (allocationResult.success && allocationResult.slot) {
        const newSlot = allocationResult.slot;
        const newSharedAcc = allocationResult.sharedAccount;

        // Get variant details
        const variant = await db.productVariant.findUnique({
          where: { id: account.productVariantId },
          include: { product: true },
        });

        const payloadRevealed = SharedAccountService.getSanitizedCustomerPayload(
          newSharedAcc,
          newSlot,
          variant || {}
        );

        // Create new active fulfillment
        const newFulfillment = await db.fulfillment.create({
          data: {
            orderItemId: oldSlot.orderItemId!,
            variantId: account.productVariantId,
            deliveryType: variant?.deliveryType || 'ACCOUNT',
            sharedAccountSlotId: newSlot.id,
            payloadRevealed,
            subscriptionExpires: newSlot.expiresAt,
            status: FulfillmentStatus.ACTIVE,
            deliveredAt: now,
          },
        });

        // Send In-App Notification to Customer
        if (oldSlot.assignedUserId) {
          await NotificationService.sendCustomerNotification({
            userId: oldSlot.assignedUserId,
            type: 'REPLACEMENT_AUTO_SUCCESS',
            category: CustomerNotificationCategory.REPLACEMENT,
            title: '⚡ Kredensial Akun Baru Anda Telah Siap!',
            message: `Akun master untuk produk ${variant?.product?.name || 'digital'} telah diperbarui. Akses kredensial baru Anda sudah dapat dilihat di menu Kredensial & Lisensi.`,
            entityType: 'Fulfillment',
            entityId: newFulfillment.id,
            actionUrl: '/account/products',
            metadata: {
              orderItemId: oldSlot.orderItemId,
              productName: variant?.product?.name,
              variantName: variant?.name,
            },
          });
        }

        replacedCount++;
        details.push({
          slotId: oldSlot.id,
          orderItemId: oldSlot.orderItemId!,
          userId: oldSlot.assignedUserId,
          status: 'REPLACED',
          newSlotId: newSlot.id,
        });
      } else {
        // Stock shortage: Customer enters waiting status without breaking order
        const variant = await db.productVariant.findUnique({
          where: { id: account.productVariantId },
          include: { product: true },
        });

        if (oldSlot.assignedUserId) {
          await NotificationService.sendCustomerNotification({
            userId: oldSlot.assignedUserId,
            type: 'REPLACEMENT_WAITING_STOCK',
            category: CustomerNotificationCategory.REPLACEMENT,
            title: '⚡ Pembaruan Akun Digital Sedang Diproses',
            message: `Akun master untuk produk ${variant?.product?.name || 'digital'} sedang diperbarui oleh admin. Kredensial baru akan otomatis dikirimkan begitu stok tersedia.`,
            entityType: 'OrderItem',
            entityId: oldSlot.orderItemId,
            actionUrl: '/account/products',
            metadata: {
              orderItemId: oldSlot.orderItemId,
              productName: variant?.product?.name,
            },
          });
        }

        waitingStockCount++;
        details.push({
          slotId: oldSlot.id,
          orderItemId: oldSlot.orderItemId!,
          userId: oldSlot.assignedUserId,
          status: 'WAITING_STOCK',
        });
      }
    }

    // 3. Log Audit Record
    await AuditService.log({
      actorId: adminUserId,
      action: 'MASS_REPLACEMENT_EXECUTED',
      entity: 'SharedAccount',
      entityId: sharedAccountId,
      after: JSON.stringify({
        totalImpacted: activeSlots.length,
        replacedCount,
        waitingStockCount,
        reason,
      }),
    });

    return {
      totalImpacted: activeSlots.length,
      replacedCount,
      waitingStockCount,
      details,
    };
  }

  /**
   * Admin action: Marks a FamilyGroup as INVALID and executes mass replacement for all active member slots
   */
  static async invalidateFamilyGroupAndReplace(
    familyGroupId: string,
    adminUserId: string,
    reason: string = 'FAMILY_GROUP_INVALID'
  ): Promise<MassReplacementResult> {
    const group = await db.familyGroup.findUnique({
      where: { id: familyGroupId },
      include: {
        variant: { include: { product: true } },
        members: {
          where: { status: SharedSlotStatus.ASSIGNED },
          include: { orderItem: true },
        },
      },
    });

    if (!group) {
      throw new Error(`FamilyGroup ${familyGroupId} not found`);
    }

    const now = new Date();

    // 1. Mark FamilyGroup as INVALID
    await db.familyGroup.update({
      where: { id: familyGroupId },
      data: {
        status: FamilyGroupStatus.INVALID,
      },
    });

    // Evaluate Supplier Warranty Claim Recommendation
    if (group.supplierId) {
      SupplierClaimRecommendationService.evaluateAndRecommendClaim({
        sharedAccountId: group.id,
        assetType: 'FAMILY_GROUP',
        failureReason: 'ACCOUNT_DISABLED',
        description: `Family Group ${group.groupReference} dinonaktifkan (${reason})`,
      }).catch((err) => console.error('[SupplierClaimRecommendation Error]:', err));
    }

    const activeMembers = group.members;
    const details: MassReplacementResult['details'] = [];
    let replacedCount = 0;
    let waitingStockCount = 0;

    // 2. Iterate through each impacted customer member slot
    for (const oldSlot of activeMembers) {
      if (!oldSlot.orderItemId) continue;

      // Mark old slot as INVALID
      await db.familyMemberSlot.update({
        where: { id: oldSlot.id },
        data: {
          status: SharedSlotStatus.INVALID,
        },
      });

      // Mark current fulfillment as REVOKED
      await db.fulfillment.updateMany({
        where: {
          orderItemId: oldSlot.orderItemId,
          familyMemberSlotId: oldSlot.id,
        },
        data: {
          status: FulfillmentStatus.REVOKED,
        },
      });

      // Try to allocate replacement slot from another eligible FamilyGroup
      const allocationResult = await db.$transaction(async (tx) => {
        return await FamilyGroupService.allocateMemberSlotTx(
          tx,
          group.productVariantId,
          oldSlot.orderItemId!,
          oldSlot.orderItem?.invitationEmail || undefined,
          oldSlot.userId || undefined
        );
      });

      if (allocationResult.success && allocationResult.slot) {
        const newSlot = allocationResult.slot;
        const newFamilyGroup = allocationResult.familyGroup;

        // Get variant details
        const variant = await db.productVariant.findUnique({
          where: { id: group.productVariantId },
          include: { product: true },
        });

        const payloadRevealed = `Family Group: ${newFamilyGroup?.groupReference || 'Active'}\nStatus: Undangan Dikirim (INVITED)`;

        // Create new active fulfillment
        const newFulfillment = await db.fulfillment.create({
          data: {
            orderItemId: oldSlot.orderItemId!,
            variantId: group.productVariantId,
            deliveryType: variant?.deliveryType || 'ACCOUNT',
            familyMemberSlotId: newSlot.id,
            payloadRevealed,
            subscriptionExpires: newSlot.expiresAt,
            status: FulfillmentStatus.ACTIVE,
            deliveredAt: now,
          },
        });

        // Send In-App Notification to Customer
        if (oldSlot.userId) {
          await NotificationService.sendCustomerNotification({
            userId: oldSlot.userId,
            type: 'REPLACEMENT_AUTO_SUCCESS',
            category: CustomerNotificationCategory.REPLACEMENT,
            title: '⚡ Akses Family Group Baru Anda Telah Siap!',
            message: `Grup Family untuk produk ${variant?.product?.name || 'digital'} telah diperbarui oleh admin. Kredensial baru sudah siap digunakan di menu Kredensial & Lisensi.`,
            entityType: 'Fulfillment',
            entityId: newFulfillment.id,
            actionUrl: '/account/products',
          });
        }

        replacedCount++;
        details.push({
          slotId: oldSlot.id,
          orderItemId: oldSlot.orderItemId!,
          userId: oldSlot.userId,
          status: 'REPLACED',
          newSlotId: newSlot.id,
        });
      } else {
        // Stock shortage: Customer enters waiting status
        const variant = await db.productVariant.findUnique({
          where: { id: group.productVariantId },
          include: { product: true },
        });

        if (oldSlot.userId) {
          await NotificationService.sendCustomerNotification({
            userId: oldSlot.userId,
            type: 'REPLACEMENT_WAITING_STOCK',
            category: CustomerNotificationCategory.REPLACEMENT,
            title: '⚡ Pembaruan Akses Family Sedang Diproses',
            message: `Grup Family untuk produk ${variant?.product?.name || 'digital'} sedang dipindahkan oleh admin. Akses baru akan otomatis dikirimkan begitu slot tersedia.`,
            entityType: 'OrderItem',
            entityId: oldSlot.orderItemId,
            actionUrl: '/account/products',
          });
        }

        waitingStockCount++;
        details.push({
          slotId: oldSlot.id,
          orderItemId: oldSlot.orderItemId!,
          userId: oldSlot.userId,
          status: 'WAITING_STOCK',
        });
      }
    }

    // 3. Log Audit Record
    await AuditService.log({
      actorId: adminUserId,
      action: 'MASS_REPLACEMENT_FAMILY_EXECUTED',
      entity: 'FamilyGroup',
      entityId: familyGroupId,
      after: JSON.stringify({
        totalImpacted: activeMembers.length,
        replacedCount,
        waitingStockCount,
        reason,
      }),
    });

    return {
      totalImpacted: activeMembers.length,
      replacedCount,
      waitingStockCount,
      details,
    };
  }
}

