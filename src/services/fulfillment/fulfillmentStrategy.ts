import { DeliveryModel, FulfillmentStatus } from '../../../generated/prisma';

export interface FulfillmentInput {
  orderItemId: string;
  variantId: string;
  userId?: string;
  invitationEmail?: string;
}

export interface FulfillmentResult {
  success: boolean;
  fulfillment?: any;
  deliveryModel: DeliveryModel;
  payloadRevealed?: string;
  reason?: string;
}

export interface IFulfillmentStrategy {
  deliveryModel: DeliveryModel;
  execute(tx: any, input: FulfillmentInput): Promise<FulfillmentResult>;
}
