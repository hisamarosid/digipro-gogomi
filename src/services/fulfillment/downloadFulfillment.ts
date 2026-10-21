import { IFulfillmentStrategy, FulfillmentInput, FulfillmentResult } from './fulfillmentStrategy';
import { DeliveryModel, FulfillmentStatus } from '../../../generated/prisma';
import crypto from 'crypto';

export class DownloadFulfillmentStrategy implements IFulfillmentStrategy {
  deliveryModel = DeliveryModel.DOWNLOAD;

  async execute(tx: any, input: FulfillmentInput): Promise<FulfillmentResult> {
    const variant = await tx.productVariant.findUnique({
      where: { id: input.variantId },
    });

    const now = new Date();
    const downloadToken = crypto.randomBytes(24).toString('hex');

    const fulfillment = await tx.fulfillment.create({
      data: {
        orderItemId: input.orderItemId,
        variantId: input.variantId,
        deliveryType: variant?.deliveryType || 'DOWNLOAD',
        downloadToken,
        payloadRevealed: `Download Link Generated: /api/downloads/${downloadToken}`,
        status: FulfillmentStatus.ACTIVE,
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
