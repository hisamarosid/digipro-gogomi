import { IFulfillmentStrategy, FulfillmentInput, FulfillmentResult } from './fulfillmentStrategy';
import { FamilyGroupService } from '../familyGroup.service';
import { DeliveryModel, FulfillmentStatus } from '../../../generated/prisma';

export class FamilyMemberFulfillmentStrategy implements IFulfillmentStrategy {
  deliveryModel = DeliveryModel.FAMILY_MEMBER;

  async execute(tx: any, input: FulfillmentInput): Promise<FulfillmentResult> {
    const allocation = await FamilyGroupService.allocateMemberSlotTx(
      tx,
      input.variantId,
      input.orderItemId,
      input.invitationEmail,
      input.userId
    );

    if (!allocation.success || !allocation.slot || !allocation.familyGroup) {
      return {
        success: false,
        deliveryModel: this.deliveryModel,
        reason: allocation.reason || 'OUT_OF_STOCK_FAMILY_MEMBER',
      };
    }

    const { slot, familyGroup } = allocation;

    const variant = await tx.productVariant.findUnique({
      where: { id: input.variantId },
    });

    const payloadRevealed = `Family Group: ${familyGroup.groupReference}\nInvitation Email: ${input.invitationEmail || 'Pending customer input'}\nStatus: Undangan Dikirim (INVITED)`;

    const now = new Date();
    const fulfillment = await tx.fulfillment.create({
      data: {
        orderItemId: input.orderItemId,
        variantId: input.variantId,
        deliveryType: variant?.deliveryType || 'ACCOUNT',
        familyMemberSlotId: slot.id,
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
