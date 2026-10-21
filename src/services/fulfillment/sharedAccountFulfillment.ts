import { IFulfillmentStrategy, FulfillmentInput, FulfillmentResult } from './fulfillmentStrategy';
import { SharedAccountService } from '../sharedAccount.service';
import { DeliveryModel, FulfillmentStatus } from '../../../generated/prisma';

export class SharedAccountFulfillmentStrategy implements IFulfillmentStrategy {
  deliveryModel = DeliveryModel.SHARED_ACCOUNT;

  async execute(tx: any, input: FulfillmentInput): Promise<FulfillmentResult> {
    const allocation = await SharedAccountService.allocateSlotTx(
      tx,
      input.variantId,
      input.orderItemId,
      input.userId
    );

    if (!allocation.success || !allocation.slot || !allocation.sharedAccount) {
      return {
        success: false,
        deliveryModel: this.deliveryModel,
        reason: allocation.reason || 'OUT_OF_STOCK_SHARED_ACCOUNT',
      };
    }

    const { slot, sharedAccount } = allocation;

    const variant = await tx.productVariant.findUnique({
      where: { id: input.variantId },
    });

    const payloadRevealed = SharedAccountService.getSanitizedCustomerPayload(
      sharedAccount,
      slot,
      variant || {}
    );

    const now = new Date();
    const fulfillment = await tx.fulfillment.create({
      data: {
        orderItemId: input.orderItemId,
        variantId: input.variantId,
        deliveryType: variant?.deliveryType || 'ACCOUNT',
        sharedAccountSlotId: slot.id,
        payloadRevealed,
        subscriptionExpires: slot.expiresAt,
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
