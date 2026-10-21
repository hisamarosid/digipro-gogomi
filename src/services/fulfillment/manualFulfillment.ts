import { IFulfillmentStrategy, FulfillmentInput, FulfillmentResult } from './fulfillmentStrategy';
import { DeliveryModel, FulfillmentStatus } from '../../../generated/prisma';

export class ManualFulfillmentStrategy implements IFulfillmentStrategy {
  deliveryModel = DeliveryModel.MANUAL;

  async execute(tx: any, input: FulfillmentInput): Promise<FulfillmentResult> {
    const variant = await tx.productVariant.findUnique({
      where: { id: input.variantId },
    });

    const now = new Date();
    const fulfillment = await tx.fulfillment.create({
      data: {
        orderItemId: input.orderItemId,
        variantId: input.variantId,
        deliveryType: variant?.deliveryType || 'MANUAL',
        payloadRevealed: 'Pesanan sedang diproses secara manual oleh Admin/CS.',
        status: FulfillmentStatus.PENDING,
        deliveredAt: now,
      },
    });

    return {
      success: true,
      deliveryModel: this.deliveryModel,
      fulfillment,
      payloadRevealed: fulfillment.payloadRevealed || undefined,
    };
  }
}
