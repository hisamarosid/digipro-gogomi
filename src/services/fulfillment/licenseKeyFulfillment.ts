import { IFulfillmentStrategy, FulfillmentInput, FulfillmentResult } from './fulfillmentStrategy';
import { DeliveryModel, FulfillmentStatus, StockStatus } from '../../../generated/prisma';
import { InventoryService } from '../inventory.service';

export class LicenseKeyFulfillmentStrategy implements IFulfillmentStrategy {
  deliveryModel = DeliveryModel.LICENSE_KEY;

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
        reason: 'OUT_OF_STOCK_LICENSE_KEY',
      };
    }

    const variant = await tx.productVariant.findUnique({
      where: { id: input.variantId },
    });

    const now = new Date();

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
        deliveryType: variant?.deliveryType || 'LICENSE_KEY',
        inventoryItemId: inventoryItem.id,
        payloadRevealed,
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
