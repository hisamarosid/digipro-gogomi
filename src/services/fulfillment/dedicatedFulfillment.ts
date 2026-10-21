import { IFulfillmentStrategy, FulfillmentInput, FulfillmentResult } from './fulfillmentStrategy';
import { DeliveryModel, FulfillmentStatus, StockStatus } from '../../../generated/prisma';
import { InventoryService } from '../inventory.service';

export class DedicatedAccountFulfillmentStrategy implements IFulfillmentStrategy {
  deliveryModel = DeliveryModel.DEDICATED_ACCOUNT;

  async execute(tx: any, input: FulfillmentInput): Promise<FulfillmentResult> {
    const inventoryItem = await tx.inventoryItem.findFirst({
      where: {
        variantId: input.variantId,
        status: StockStatus.AVAILABLE,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!inventoryItem) {
      return {
        success: false,
        deliveryModel: this.deliveryModel,
        reason: 'OUT_OF_STOCK_DEDICATED_ACCOUNT',
      };
    }

    const variant = await tx.productVariant.findUnique({
      where: { id: input.variantId },
    });

    const now = new Date();
    const days = variant?.subscriptionDays || 30;
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Assign inventory item
    await tx.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        status: StockStatus.ASSIGNED,
        assignedAt: now,
        assignedOrderItemId: input.orderItemId,
      },
    });

    const payloadRevealed = InventoryService.getPlainPayload(inventoryItem);

    const fulfillment = await tx.fulfillment.create({
      data: {
        orderItemId: input.orderItemId,
        variantId: input.variantId,
        deliveryType: variant?.deliveryType || 'ACCOUNT',
        inventoryItemId: inventoryItem.id,
        payloadRevealed,
        subscriptionExpires: expiresAt,
        status: FulfillmentStatus.ACTIVE,
        deliveredAt: now,
      },
    });

    return {
      success: true,
      deliveryModel: this.deliveryModel,
      fulfillment,
      payloadRevealed,
    };
  }
}
