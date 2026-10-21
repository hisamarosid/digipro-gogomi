import { db } from '@/lib/db/prisma';
import { generateSecureToken } from '@/lib/utils/formatters';
import { InventoryService } from '../inventory.service';
import { SharedAccountService } from '../sharedAccount.service';
import { FamilyGroupService } from '../familyGroup.service';
import { ReplacementEligibilityService } from './eligibility';
import {
  FulfillmentStatus,
  ReplacementMode,
  ReplacementReason,
  ReplacementStatus,
  StockStatus,
  CustomerNotificationCategory,
  AdminNotificationCategory,
  NotificationSeverity,
  DeliveryModel,
  SharedSlotStatus,
} from '../../../generated/prisma';
import { NotificationService } from '../notification.service';
import { TelegramService } from '../telegram.service';
import { SupplierClaimRecommendationService } from '../supplier-warranty/supplier-claim-recommendation.service';

export interface RequestReplacementInput {
  orderItemId: string;
  userId: string;
  reason?: ReplacementReason;
  customerNote?: string;
  idempotencyKey?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class ReplacementService {
  /**
   * Main customer-facing atomic replacement request handler with Multi-Delivery Model support
   */
  static async requestReplacement(input: RequestReplacementInput) {
    const { orderItemId, userId, reason, customerNote, idempotencyKey, ipAddress, userAgent } = input;

    // 1. Idempotency Key check
    if (idempotencyKey) {
      const existingRequest = await db.replacementRequest.findUnique({
        where: { idempotencyKey },
        include: {
          newFulfillment: true,
        },
      });

      if (existingRequest) {
        return {
          success: true,
          request: existingRequest,
          idempotent: true,
        };
      }
    }

    // 2. Initial Eligibility Check
    const eligibility = await ReplacementEligibilityService.checkReplacementEligibility(
      orderItemId,
      userId
    );

    if (!eligibility.eligible && eligibility.reason !== 'WAITING_STOCK_ALLOWED') {
      throw new Error(`Replacement tidak diizinkan: ${eligibility.reason}`);
    }

    const { orderItem, activeFulfillment, mode } = eligibility;
    const variant = orderItem.variant;

    const requestNumber = `REP-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${generateSecureToken(6).toUpperCase()}`;

    // 3. Mode MANUAL_APPROVAL Flow
    if (mode === ReplacementMode.MANUAL_APPROVAL) {
      const pendingRequest = await db.replacementRequest.create({
        data: {
          requestNumber,
          userId,
          orderId: orderItem.orderId,
          orderItemId,
          productId: variant.productId,
          productVariantId: variant.id,
          previousFulfillmentId: activeFulfillment?.id || null,
          previousInventoryItemId: activeFulfillment?.inventoryItemId || null,
          mode: ReplacementMode.MANUAL_APPROVAL,
          status: ReplacementStatus.PENDING,
          reason: reason || null,
          customerNote: customerNote || null,
          idempotencyKey: idempotencyKey || null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      // Audit Log
      await db.auditLog.create({
        data: {
          actorId: userId,
          action: 'REPLACEMENT_REQUESTED_MANUAL',
          entity: 'ReplacementRequest',
          entityId: pendingRequest.id,
          ip: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      // Telegram Admin Alert
      TelegramService.sendReplacementRequestedNotification({
        requestId: pendingRequest.id,
        requestNumber: pendingRequest.requestNumber,
        orderNumber: orderItem.order?.orderNumber,
        productName: variant.product?.name || orderItem.productName || 'Produk Digital',
        customerEmail: orderItem.order?.user?.email || undefined,
        reason: reason || undefined,
        isAutoApproved: false,
      }).catch(() => {});

      return {
        success: true,
        status: ReplacementStatus.PENDING,
        request: pendingRequest,
        message: 'Permintaan replacement Anda telah dikirim dan menunggu persetujuan admin.',
      };
    }

    // 4. Mode AUTO Flow inside Database Transaction with Multi-Model Support
    return await db.$transaction(async (tx) => {
      // Re-check for active request inside transaction lock
      const unresolved = await tx.replacementRequest.findFirst({
        where: {
          orderItemId,
          status: { in: [ReplacementStatus.PENDING, ReplacementStatus.PROCESSING, ReplacementStatus.WAITING_STOCK] },
        },
      });

      if (unresolved) {
        throw new Error('Permintaan replacement sedang diproses.');
      }

      const deliveryModel =
        (orderItem.deliveryModelSnapshot as DeliveryModel) ||
        (variant.deliveryModel as DeliveryModel) ||
        DeliveryModel.DEDICATED_ACCOUNT;

      let newFulfillment: any = null;
      let newInventoryItemId: string | null = null;
      let newSharedAccountSlotId: string | null = null;
      let newFamilyMemberSlotId: string | null = null;

      // --- ALLOCATION BRANCH BASED ON DELIVERY MODEL ---
      if (deliveryModel === DeliveryModel.SHARED_ACCOUNT) {
        const alloc = await SharedAccountService.allocateSlotTx(tx, variant.id, orderItemId, userId);
        if (!alloc.success || !alloc.slot || !alloc.sharedAccount) {
          return handleOutOfStockQueue(tx);
        }

        const plainPayload = SharedAccountService.getSanitizedCustomerPayload(
          alloc.sharedAccount,
          alloc.slot,
          variant
        );

        newFulfillment = await tx.fulfillment.create({
          data: {
            orderItemId,
            variantId: variant.id,
            deliveryType: orderItem.deliveryType,
            sharedAccountSlotId: alloc.slot.id,
            payloadRevealed: plainPayload,
            subscriptionExpires: alloc.slot.expiresAt,
            status: FulfillmentStatus.ACTIVE,
            deliveredAt: new Date(),
          },
        });
        newSharedAccountSlotId = alloc.slot.id;

      } else if (deliveryModel === DeliveryModel.FAMILY_MEMBER) {
        const alloc = await FamilyGroupService.allocateMemberSlotTx(
          tx,
          variant.id,
          orderItemId,
          orderItem.invitationEmail || undefined,
          userId
        );
        if (!alloc.success || !alloc.slot || !alloc.familyGroup) {
          return handleOutOfStockQueue(tx);
        }

        const plainPayload = `Family Group: ${alloc.familyGroup.groupReference}\nInvitation Email: ${orderItem.invitationEmail || 'Pending customer input'}\nStatus: Undangan Dikirim (INVITED)`;

        newFulfillment = await tx.fulfillment.create({
          data: {
            orderItemId,
            variantId: variant.id,
            deliveryType: orderItem.deliveryType,
            familyMemberSlotId: alloc.slot.id,
            payloadRevealed: plainPayload,
            subscriptionExpires: alloc.slot.expiresAt,
            status: FulfillmentStatus.ACTIVE,
            deliveredAt: new Date(),
          },
        });
        newFamilyMemberSlotId = alloc.slot.id;

      } else {
        // DEDICATED_ACCOUNT, LICENSE_KEY, DOWNLOAD, MANUAL
        const alloc = await InventoryService.allocateStockTx(tx, variant.id, orderItemId);
        if (!alloc.success || !alloc.item) {
          return handleOutOfStockQueue(tx);
        }

        const plainPayload = InventoryService.getPlainPayload(alloc.item);

        newFulfillment = await tx.fulfillment.create({
          data: {
            orderItemId,
            variantId: variant.id,
            deliveryType: orderItem.deliveryType,
            inventoryItemId: alloc.item.id,
            payloadRevealed: plainPayload,
            subscriptionExpires: activeFulfillment?.subscriptionExpires || null,
            status: FulfillmentStatus.ACTIVE,
            deliveredAt: new Date(),
          },
        });
        newInventoryItemId = alloc.item.id;
      }

      // Helper function when stock allocation is empty
      async function handleOutOfStockQueue(transaction: any) {
        if (variant.replacementAllowWhenOutOfStockQueue) {
          const waitingRequest = await transaction.replacementRequest.create({
            data: {
              requestNumber,
              userId,
              orderId: orderItem.orderId,
              orderItemId,
              productId: variant.productId,
              productVariantId: variant.id,
              previousFulfillmentId: activeFulfillment?.id || null,
              previousInventoryItemId: activeFulfillment?.inventoryItemId || null,
              mode: ReplacementMode.AUTO,
              status: ReplacementStatus.WAITING_STOCK,
              reason: reason || null,
              customerNote: customerNote || null,
              idempotencyKey: idempotencyKey || null,
              ipAddress: ipAddress || null,
              userAgent: userAgent || null,
            },
          });

          await transaction.auditLog.create({
            data: {
              actorId: userId,
              action: 'REPLACEMENT_WAITING_STOCK',
              entity: 'ReplacementRequest',
              entityId: waitingRequest.id,
              ip: ipAddress || null,
              userAgent: userAgent || null,
            },
          });

          return {
            success: true,
            status: ReplacementStatus.WAITING_STOCK,
            request: waitingRequest,
            message: 'Stok replacement saat ini habis. Request Anda telah masuk ke antrean dan akan diproses saat stok tersedia.',
          };
        } else {
          throw new Error('Stok replacement saat ini tidak tersedia.');
        }
      }

      // Mark Old Active Fulfillment & Inventory / Slot Status
      const oldFulfillmentStatus =
        reason === ReplacementReason.ACCOUNT_DISABLED ? FulfillmentStatus.INVALID : FulfillmentStatus.REPLACED;
      const oldInventoryStatus =
        reason === ReplacementReason.ACCOUNT_DISABLED ? StockStatus.INVALID : StockStatus.REPLACED;

      if (activeFulfillment) {
        await tx.fulfillment.update({
          where: { id: activeFulfillment.id },
          data: { status: oldFulfillmentStatus },
        });

        if (activeFulfillment.inventoryItemId) {
          await tx.inventoryItem.update({
            where: { id: activeFulfillment.inventoryItemId },
            data: { status: oldInventoryStatus },
          });

          // Auto-trigger supplier claim recommendation for broken inventory
          if (oldInventoryStatus === StockStatus.INVALID) {
            SupplierClaimRecommendationService.evaluateAndRecommendClaim({
              inventoryId: activeFulfillment.inventoryItemId,
              failureReason: 'ACCOUNT_DISABLED',
              description: `Stock item marked INVALID from customer replacement #${requestNumber}`,
            }).catch(() => {});
          }
        }

        if (activeFulfillment.sharedAccountSlotId) {
          const oldSlot = await tx.sharedAccountSlot.findUnique({
            where: { id: activeFulfillment.sharedAccountSlotId },
            select: { id: true, sharedAccountId: true, sharedAccount: { select: { label: true } } },
          });

          await tx.sharedAccountSlot.update({
            where: { id: activeFulfillment.sharedAccountSlotId },
            data: {
              status: reason === ReplacementReason.ACCOUNT_DISABLED ? SharedSlotStatus.INVALID : SharedSlotStatus.EXPIRED,
            },
          });

          if (oldSlot?.sharedAccountId) {
            const otherActiveSlots = await tx.sharedAccountSlot.findMany({
              where: {
                sharedAccountId: oldSlot.sharedAccountId,
                status: SharedSlotStatus.ASSIGNED,
                id: { not: oldSlot.id },
              },
              select: { id: true, assignedUserId: true },
            });

            if (otherActiveSlots.length > 0) {
              // Dispatch Admin Notification for multi-slot account compromise
              NotificationService.sendAdminNotification({
                type: 'SHARED_ACCOUNT_SLOT_REPORTED_BROKEN',
                category: AdminNotificationCategory.INVENTORY,
                severity: NotificationSeverity.HIGH,
                title: `⚠️ Akun Master ${oldSlot.sharedAccount?.label || 'Shared'} Dilaporkan Rusak`,
                message: `Customer baru saja mereplace slot pada akun master "${oldSlot.sharedAccount?.label}". Masih ada ${otherActiveSlots.length} customer lain yang menggunakan akun ini. Segera cek dan lakukan migrasi massal di menu inventori shared.`,
                entityType: 'SharedAccount',
                entityId: oldSlot.sharedAccountId,
                actionUrl: `/admin/inventory/shared?search=${encodeURIComponent(oldSlot.sharedAccount?.label || '')}`,
                dedupeKey: `shared-broken-${oldSlot.sharedAccountId}-${new Date().toISOString().slice(0, 10)}`,
              }).catch(() => {});

              // Telegram Alert
              TelegramService.sendSharedMasterInvalidNotification({
                accountId: oldSlot.sharedAccountId,
                label: oldSlot.sharedAccount?.label || 'Shared Master',
                productName: variant.product?.name || orderItem.productName || 'Shared Account',
                variantName: variant.name,
                affectedSlots: otherActiveSlots.length,
                reason: `1 Slot Customer mereplace akun (${reason || 'ACCOUNT_DISABLED'}). Sisa ${otherActiveSlots.length} customer butuh migrasi!`,
              }).catch(() => {});
            }
          }
        }

        if (activeFulfillment.familyMemberSlotId) {
          const oldMemberSlot = await tx.familyMemberSlot.findUnique({
            where: { id: activeFulfillment.familyMemberSlotId },
            include: { familyGroup: true },
          });

          await tx.familyMemberSlot.update({
            where: { id: activeFulfillment.familyMemberSlotId },
            data: {
              status: SharedSlotStatus.INVALID,
            },
          });

          if (oldMemberSlot?.familyGroupId) {
            const otherActiveMembers = await tx.familyMemberSlot.findMany({
              where: {
                familyGroupId: oldMemberSlot.familyGroupId,
                status: SharedSlotStatus.ASSIGNED,
                id: { not: oldMemberSlot.id },
              },
              select: { id: true, userId: true },
            });

            if (otherActiveMembers.length > 0) {
              NotificationService.sendAdminNotification({
                type: 'FAMILY_GROUP_MEMBER_REPORTED_BROKEN',
                category: AdminNotificationCategory.INVENTORY,
                severity: NotificationSeverity.HIGH,
                title: `⚠️ Family Group ${oldMemberSlot.familyGroup?.groupReference || 'Family'} Dilaporkan Rusak`,
                message: `Member baru saja mereplace slot pada Family Group "${oldMemberSlot.familyGroup?.groupReference}". Masih ada ${otherActiveMembers.length} member lain yang menggunakan grup ini. Segera cek dan lakukan migrasi massal di menu inventori family.`,
                entityType: 'FamilyGroup',
                entityId: oldMemberSlot.familyGroupId,
                actionUrl: `/admin/inventory/families?search=${encodeURIComponent(oldMemberSlot.familyGroup?.groupReference || '')}`,
                dedupeKey: `family-broken-${oldMemberSlot.familyGroupId}-${new Date().toISOString().slice(0, 10)}`,
              }).catch(() => {});
            }
          }
        }
      }

      // Calculate next eligible date after processing
      const cooldownHours = variant.replacementCooldownHours || 72;
      const nextEligibleAtAfterProcessing = new Date(Date.now() + cooldownHours * 3600 * 1000);

      // Create Completed Replacement Record
      const completedRequest = await tx.replacementRequest.create({
        data: {
          requestNumber,
          userId,
          orderId: orderItem.orderId,
          orderItemId,
          productId: variant.productId,
          productVariantId: variant.id,
          previousFulfillmentId: activeFulfillment?.id || null,
          previousInventoryItemId: activeFulfillment?.inventoryItemId || null,
          newFulfillmentId: newFulfillment.id,
          newInventoryItemId,
          mode: ReplacementMode.AUTO,
          status: ReplacementStatus.COMPLETED,
          reason: reason || null,
          customerNote: customerNote || null,
          idempotencyKey: idempotencyKey || null,
          processingStartedAt: new Date(),
          processedAt: new Date(),
          nextEligibleAtAfterProcessing,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'REPLACEMENT_COMPLETED_AUTO',
          entity: 'ReplacementRequest',
          entityId: completedRequest.id,
          ip: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      // Send Customer In-App Notification
      await NotificationService.sendCustomerNotification({
        userId,
        type: 'REPLACEMENT_COMPLETED',
        category: CustomerNotificationCategory.REPLACEMENT,
        title: '⚡ Auto Replacement Berhasil!',
        message: `Permintaan tukar akun untuk produk ${orderItem.productName} telah diproses secara otomatis. Kredensial baru sudah siap digunakan.`,
        entityType: 'Fulfillment',
        entityId: newFulfillment.id,
        actionUrl: '/account/products',
      });

      // Trigger supplier claim recommendation for internal business recovery
      SupplierClaimRecommendationService.evaluateAndRecommendClaim({
        replacementId: completedRequest.id,
        failureReason: reason === 'CANNOT_LOGIN' || reason === 'ACCOUNT_DISABLED' ? 'ACCOUNT_DISABLED' : 'LOGIN_FAILED',
      }).catch((err) => console.error('[SupplierClaimRecommendation Error]:', err));

      return {
        success: true,
        status: ReplacementStatus.COMPLETED,
        request: completedRequest,
        newFulfillment,
        nextEligibleAt: nextEligibleAtAfterProcessing,
        message: 'Replacement berhasil! Akun baru telah diberikan.',
      };
    });
  }

  /**
   * Admin approves a PENDING or WAITING_STOCK replacement request with Multi-Delivery Model support
   */
  static async approveReplacement(requestId: string, adminActorId: string, adminNote?: string) {
    const request = await db.replacementRequest.findUnique({
      where: { id: requestId },
      include: {
        orderItem: { include: { variant: true } },
        user: true,
      },
    });

    if (!request) {
      throw new Error('Replacement request tidak ditemukan');
    }

    if (request.status !== ReplacementStatus.PENDING && request.status !== ReplacementStatus.WAITING_STOCK) {
      throw new Error(`Replacement request dengan status ${request.status} tidak dapat disetujui`);
    }

    const { orderItem, userId } = request;
    const variant = orderItem.variant;

    return await db.$transaction(async (tx) => {
      // Find active fulfillment
      const activeFulfillment = await tx.fulfillment.findFirst({
        where: {
          orderItemId: orderItem.id,
          status: { in: [FulfillmentStatus.ACTIVE, FulfillmentStatus.FULFILLED] },
        },
        orderBy: { createdAt: 'desc' },
      });

      const deliveryModel =
        (orderItem.deliveryModelSnapshot as DeliveryModel) ||
        (variant.deliveryModel as DeliveryModel) ||
        DeliveryModel.DEDICATED_ACCOUNT;

      let newFulfillment: any = null;
      let newInventoryItemId: string | null = null;

      if (deliveryModel === DeliveryModel.SHARED_ACCOUNT) {
        const alloc = await SharedAccountService.allocateSlotTx(tx, variant.id, orderItem.id, userId);
        if (!alloc.success || !alloc.slot || !alloc.sharedAccount) {
          throw new Error('Stok Shared Account habis. Silakan tambahkan akun shared baru terlebih dahulu.');
        }
        const plainPayload = SharedAccountService.getSanitizedCustomerPayload(alloc.sharedAccount, alloc.slot, variant);
        newFulfillment = await tx.fulfillment.create({
          data: {
            orderItemId: orderItem.id,
            variantId: variant.id,
            deliveryType: orderItem.deliveryType,
            sharedAccountSlotId: alloc.slot.id,
            payloadRevealed: plainPayload,
            subscriptionExpires: alloc.slot.expiresAt,
            status: FulfillmentStatus.ACTIVE,
            deliveredAt: new Date(),
          },
        });
      } else if (deliveryModel === DeliveryModel.FAMILY_MEMBER) {
        const alloc = await FamilyGroupService.allocateMemberSlotTx(tx, variant.id, orderItem.id, orderItem.invitationEmail || undefined, userId);
        if (!alloc.success || !alloc.slot || !alloc.familyGroup) {
          throw new Error('Stok Grup Family habis. Silakan tambahkan grup family baru terlebih dahulu.');
        }
        const plainPayload = `Family Group: ${alloc.familyGroup.groupReference}\nStatus: Undangan Dikirim (INVITED)`;
        newFulfillment = await tx.fulfillment.create({
          data: {
            orderItemId: orderItem.id,
            variantId: variant.id,
            deliveryType: orderItem.deliveryType,
            familyMemberSlotId: alloc.slot.id,
            payloadRevealed: plainPayload,
            subscriptionExpires: alloc.slot.expiresAt,
            status: FulfillmentStatus.ACTIVE,
            deliveredAt: new Date(),
          },
        });
      } else {
        const availableInventory = await tx.inventoryItem.findFirst({
          where: {
            variantId: variant.id,
            status: StockStatus.AVAILABLE,
          },
          orderBy: { createdAt: 'asc' },
        });

        if (!availableInventory) {
          throw new Error('Stok produk habis. Silakan tambahkan stok terlebih dahulu sebelum menyetujui replacement.');
        }

        const plainPayload = InventoryService.getPlainPayload(availableInventory);
        newFulfillment = await tx.fulfillment.create({
          data: {
            orderItemId: orderItem.id,
            variantId: variant.id,
            deliveryType: orderItem.deliveryType,
            inventoryItemId: availableInventory.id,
            payloadRevealed: plainPayload,
            subscriptionExpires: activeFulfillment?.subscriptionExpires || null,
            status: FulfillmentStatus.ACTIVE,
            deliveredAt: new Date(),
          },
        });

        await tx.inventoryItem.update({
          where: { id: availableInventory.id },
          data: {
            status: StockStatus.ASSIGNED,
            assignedOrderItemId: orderItem.id,
            assignedAt: new Date(),
          },
        });

        newInventoryItemId = availableInventory.id;
      }

      // Mark old fulfillment & inventory
      if (activeFulfillment) {
        await tx.fulfillment.update({
          where: { id: activeFulfillment.id },
          data: { status: FulfillmentStatus.REPLACED },
        });

        if (activeFulfillment.inventoryItemId) {
          await tx.inventoryItem.update({
            where: { id: activeFulfillment.inventoryItemId },
            data: { status: StockStatus.REPLACED },
          });
        }
      }

      const cooldownHours = variant.replacementCooldownHours || 72;
      const nextEligibleAtAfterProcessing = new Date(Date.now() + cooldownHours * 3600 * 1000);

      // Update replacement request to COMPLETED
      const updatedRequest = await tx.replacementRequest.update({
        where: { id: requestId },
        data: {
          status: ReplacementStatus.COMPLETED,
          newFulfillmentId: newFulfillment.id,
          newInventoryItemId,
          adminNote: adminNote || null,
          processedAt: new Date(),
          nextEligibleAtAfterProcessing,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminActorId,
          action: 'REPLACEMENT_APPROVED_ADMIN',
          entity: 'ReplacementRequest',
          entityId: requestId,
        },
      });

      // Send Customer In-App Notification
      await NotificationService.sendCustomerNotification({
        userId: request.userId,
        type: 'REPLACEMENT_APPROVED',
        category: CustomerNotificationCategory.REPLACEMENT,
        title: '⚡ Permintaan Replacement Disetujui Admin!',
        message: `Pengajuan garansi/replacement untuk produk ${request.orderItem.productName} telah disetujui. Kredensial baru Anda sudah dapat diakses.`,
        entityType: 'Fulfillment',
        entityId: newFulfillment.id,
        actionUrl: '/account/products',
      });

      return {
        success: true,
        request: updatedRequest,
        newFulfillment,
      };
    });
  }

  /**
   * Admin rejects a replacement request with reason
   */
  static async rejectReplacement(requestId: string, adminActorId: string, reason: string, adminNote?: string) {
    const request = await db.replacementRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Replacement request tidak ditemukan');
    }

    const updated = await db.replacementRequest.update({
      where: { id: requestId },
      data: {
        status: ReplacementStatus.REJECTED,
        adminNote: adminNote || reason,
        processedAt: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        actorId: adminActorId,
        action: 'REPLACEMENT_REJECTED_ADMIN',
        entity: 'ReplacementRequest',
        entityId: requestId,
      },
    });

    return updated;
  }

  /**
   * Admin force replacement override
   */
  static async forceReplacement(orderItemId: string, adminActorId: string, reason: string, adminNote?: string) {
    const orderItem = await db.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
        variant: true,
      },
    });

    if (!orderItem) {
      throw new Error('Order item tidak ditemukan');
    }

    const variant = orderItem.variant;

    return await db.$transaction(async (tx) => {
      const activeFulfillment = await tx.fulfillment.findFirst({
        where: {
          orderItemId: orderItem.id,
          status: { in: [FulfillmentStatus.ACTIVE, FulfillmentStatus.FULFILLED] },
        },
        orderBy: { createdAt: 'desc' },
      });

      const availableInventory = await tx.inventoryItem.findFirst({
        where: {
          variantId: variant.id,
          status: StockStatus.AVAILABLE,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!availableInventory) {
        throw new Error('Stok tidak tersedia untuk force replacement.');
      }

      if (activeFulfillment) {
        await tx.fulfillment.update({
          where: { id: activeFulfillment.id },
          data: { status: FulfillmentStatus.REPLACED },
        });

        if (activeFulfillment.inventoryItemId) {
          await tx.inventoryItem.update({
            where: { id: activeFulfillment.inventoryItemId },
            data: { status: StockStatus.REPLACED },
          });
        }
      }

      const plainPayload = InventoryService.getPlainPayload(availableInventory);

      const newFulfillment = await tx.fulfillment.create({
        data: {
          orderItemId: orderItem.id,
          variantId: variant.id,
          deliveryType: orderItem.deliveryType,
          inventoryItemId: availableInventory.id,
          payloadRevealed: plainPayload,
          subscriptionExpires: activeFulfillment?.subscriptionExpires || null,
          status: FulfillmentStatus.ACTIVE,
          deliveredAt: new Date(),
        },
      });

      await tx.inventoryItem.update({
        where: { id: availableInventory.id },
        data: {
          status: StockStatus.ASSIGNED,
          assignedOrderItemId: orderItem.id,
          assignedAt: new Date(),
        },
      });

      const cooldownHours = variant.replacementCooldownHours || 72;
      const nextEligibleAtAfterProcessing = new Date(Date.now() + cooldownHours * 3600 * 1000);

      const requestNumber = `FORCE-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${generateSecureToken(6).toUpperCase()}`;

      const forcedRequest = await tx.replacementRequest.create({
        data: {
          requestNumber,
          userId: orderItem.order.userId || adminActorId,
          orderId: orderItem.orderId,
          orderItemId,
          productId: variant.productId,
          productVariantId: variant.id,
          previousFulfillmentId: activeFulfillment?.id || null,
          previousInventoryItemId: activeFulfillment?.inventoryItemId || null,
          newFulfillmentId: newFulfillment.id,
          newInventoryItemId: availableInventory.id,
          mode: ReplacementMode.AUTO,
          status: ReplacementStatus.COMPLETED,
          customerNote: reason,
          adminNote: adminNote || 'Admin Forced Replacement',
          processedAt: new Date(),
          nextEligibleAtAfterProcessing,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminActorId,
          action: 'REPLACEMENT_FORCED_ADMIN',
          entity: 'ReplacementRequest',
          entityId: forcedRequest.id,
        },
      });

      return {
        success: true,
        request: forcedRequest,
        newFulfillment,
      };
    });
  }

  /**
   * Process all WAITING_STOCK queue items in FIFO order
   */
  static async processWaitingQueue(adminActorId: string = 'SYSTEM_AUTO') {
    const waitingRequests = await db.replacementRequest.findMany({
      where: { status: ReplacementStatus.WAITING_STOCK },
      orderBy: { requestedAt: 'asc' },
    });

    let processedCount = 0;

    for (const req of waitingRequests) {
      try {
        await this.approveReplacement(req.id, adminActorId, 'Processed via waiting queue auto-sync');
        processedCount++;
      } catch {
        // Continue queue processing if stock runs out for this variant
        continue;
      }
    }

    return {
      processedCount,
      remainingCount: waitingRequests.length - processedCount,
    };
  }
}
