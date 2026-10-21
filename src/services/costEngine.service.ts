import { db } from '@/lib/db/prisma';
import { CostAllocationMode, DeliveryModel, OrderStatus } from '../../generated/prisma';

export interface ItemCOGSResult {
  costAmount: number;
  isCostUnknown: boolean;
  supplierId: string | null;
}

export class CostEngineService {
  /**
   * Resolves exact COGS for an allocated fulfillment item
   */
  static async resolveItemCOGS(
    tx: any,
    orderItemId: string,
    deliveryModel: DeliveryModel
  ): Promise<ItemCOGSResult> {
    const item = await tx.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        variant: true,
        inventoryItem: true,
        sharedAccountSlots: true,
        familyMemberSlots: true,
      },
    });

    if (!item) {
      return { costAmount: 0, isCostUnknown: true, supplierId: null };
    }

    // 1. Dedicated Account or License Key
    if (item.inventoryItem) {
      const invCost = item.inventoryItem.costAmount;
      const supplierId = item.inventoryItem.supplierId;
      const costAmount = invCost > 0 ? invCost : item.variant?.defaultCostAmount || 0;
      return {
        costAmount,
        isCostUnknown: invCost === 0 && (item.variant?.defaultCostAmount || 0) === 0,
        supplierId,
      };
    }

    // 2. Shared Account Slot
    if (item.sharedAccountSlots && item.sharedAccountSlots.length > 0) {
      const slot = item.sharedAccountSlots[0];
      const master = slot.sharedAccountId
        ? await tx.sharedAccount.findUnique({ where: { id: slot.sharedAccountId } })
        : null;
      if (master) {
        const mode = master.costAllocationMode || CostAllocationMode.EQUAL_PER_SLOT;
        let costAmount = 0;
        if (mode === CostAllocationMode.EQUAL_PER_SLOT) {
          costAmount = master.maxSlots > 0 ? Math.round(master.acquisitionCost / master.maxSlots) : 0;
        } else {
          costAmount = master.acquisitionCost;
        }

        if (costAmount === 0 && item.variant?.defaultCostAmount) {
          costAmount = item.variant.defaultCostAmount;
        }

        return {
          costAmount,
          isCostUnknown: costAmount === 0,
          supplierId: master.supplierId,
        };
      }
    }

    // 3. Family Member Slot
    if (item.familyMemberSlots && item.familyMemberSlots.length > 0) {
      const member = item.familyMemberSlots[0];
      const group = member.familyGroupId
        ? await tx.familyGroup.findUnique({ where: { id: member.familyGroupId } })
        : null;
      if (group) {
        const costAmount = group.maxMembers > 0 ? Math.round(group.acquisitionCost / group.maxMembers) : 0;
        return {
          costAmount: costAmount > 0 ? costAmount : item.variant?.defaultCostAmount || 0,
          isCostUnknown: costAmount === 0 && (item.variant?.defaultCostAmount || 0) === 0,
          supplierId: group.supplierId,
        };
      }
    }

    // Fallback to variant default cost
    const defaultCost = item.variant?.defaultCostAmount || 0;
    return {
      costAmount: defaultCost,
      isCostUnknown: defaultCost === 0,
      supplierId: null,
    };
  }

  /**
   * Generates or updates the immutable OrderFinancialSnapshot for an order
   */
  static async generateOrderFinancialSnapshot(tx: any, orderId: string): Promise<any> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        replacementRequests: true,
      },
    });

    if (!order) return null;

    const subtotal = order.totalAmount;
    const productDiscount = order.discountAmount || 0;
    const couponDiscount = 0; // Included in order.discountAmount if coupon applied
    const coinDiscount = order.coinDiscountAmount || 0;

    // Net Sales Value = subtotal - productDiscount - coinDiscount
    const grossRevenue = Math.max(0, subtotal - productDiscount - coinDiscount);
    const cashPayableAmount = order.cashPayableAmount || grossRevenue;

    // Calculate total recognized COGS across order items
    let recognizedCOGS = 0;
    let itemsWithUnknownCost = 0;

    for (const item of order.items) {
      if (item.isCostUnknown || item.costAmountSnapshot === 0) {
        itemsWithUnknownCost++;
      }
      recognizedCOGS += (item.costAmountSnapshot || 0) * (item.quantity || 1);
    }

    // Calculate replacement loss attributed to order
    const replacementCost = order.replacementRequests.reduce(
      (acc: number, rep: any) => acc + (rep.replacementCostAmount || 0),
      0
    );

    // Calculate estimated payment fee
    const paymentSettings = await tx.globalBusinessSettings.findUnique({ where: { id: 'default' } });
    let paymentFee = 0;
    if (paymentSettings?.paymentFeeMode === 'FIXED') {
      paymentFee = Math.round(paymentSettings.paymentFeeValue || 0);
    } else if (paymentSettings?.paymentFeeMode === 'PERCENTAGE') {
      paymentFee = Math.round((cashPayableAmount * (paymentSettings.paymentFeeValue || 0)) / 100);
    }

    // Gross Profit = Gross Revenue - COGS - Payment Fee - Replacement Cost
    const grossProfit = grossRevenue - recognizedCOGS - paymentFee - replacementCost;
    const grossMargin = grossRevenue > 0 ? Number(((grossProfit / grossRevenue) * 100).toFixed(2)) : 0;

    const totalItems = order.items.length;
    const costCoveragePercentage =
      totalItems > 0 ? Number((((totalItems - itemsWithUnknownCost) / totalItems) * 100).toFixed(1)) : 100;

    const snapshot = await tx.orderFinancialSnapshot.upsert({
      where: { orderId },
      update: {
        subtotal,
        productDiscount,
        couponDiscount,
        coinDiscount,
        cashPayableAmount,
        coinUsed: order.coinUsed || 0,
        paymentFee,
        grossRevenue,
        recognizedCOGS,
        replacementCost,
        grossProfit,
        grossMargin,
        isCostUnknown: itemsWithUnknownCost > 0,
        costCoveragePercentage,
      },
      create: {
        orderId,
        subtotal,
        productDiscount,
        couponDiscount,
        coinDiscount,
        cashPayableAmount,
        coinUsed: order.coinUsed || 0,
        paymentFee,
        grossRevenue,
        recognizedCOGS,
        replacementCost,
        grossProfit,
        grossMargin,
        isCostUnknown: itemsWithUnknownCost > 0,
        costCoveragePercentage,
      },
    });

    return snapshot;
  }
}

export class PricingService {
  /**
   * Validates if applied coupon/coin discounts satisfy minimum margin protection policy
   */
  static async validateMarginProtection(
    variantId: string,
    sellingPrice: number,
    totalDiscount: number
  ): Promise<{ allowed: boolean; maxAllowedDiscount: number; minMarginPercentage: number }> {
    const [settings, variant] = await Promise.all([
      db.globalBusinessSettings.findUnique({ where: { id: 'default' } }),
      db.productVariant.findUnique({ where: { id: variantId } }),
    ]);

    const isProtectionEnabled = settings?.marginProtectionEnabled || false;
    let minMarginPct = settings?.minimumMarginPercentage || 15.0;

    if (variant?.minimumMarginMode === 'CUSTOM' && variant.customMinimumMargin != null) {
      minMarginPct = variant.customMinimumMargin;
    } else if (variant?.minimumMarginMode === 'DISABLED') {
      return { allowed: true, maxAllowedDiscount: sellingPrice, minMarginPercentage: 0 };
    }

    if (!isProtectionEnabled) {
      return { allowed: true, maxAllowedDiscount: sellingPrice, minMarginPercentage: minMarginPct };
    }

    const itemCost = variant?.defaultCostAmount || 0;
    // Net Revenue = sellingPrice - discount
    // Required Net Revenue = itemCost / (1 - (minMarginPct / 100))
    // Max Allowed Discount = sellingPrice - Required Net Revenue
    const minRequiredNetRevenue = Math.ceil(itemCost / Math.max(0.01, 1 - minMarginPct / 100));
    const maxAllowedDiscount = Math.max(0, sellingPrice - minRequiredNetRevenue);

    return {
      allowed: totalDiscount <= maxAllowedDiscount,
      maxAllowedDiscount,
      minMarginPercentage: minMarginPct,
    };
  }
}
