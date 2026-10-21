import { db } from '@/lib/db/prisma';
import { OfferStatus, OfferTargetType } from '../../generated/prisma';
import { LoyaltyTierService } from './loyaltyTier.service';

export class CustomerOfferService {
  /**
   * Fetch eligible promotional customer offers for user
   */
  static async getEligibleOffersForUser(userId?: string | null) {
    const now = new Date();

    const activeOffers = await db.customerOffer.findMany({
      where: {
        status: OfferStatus.ACTIVE,
        OR: [
          { startAt: null },
          { startAt: { lte: now } },
        ],
        AND: [
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      },
      include: {
        targetTier: true,
        product: true,
        variant: true,
      },
      orderBy: { discountValue: 'desc' },
    });

    if (!userId) {
      return activeOffers.filter((o) => o.targetType === OfferTargetType.ALL_CUSTOMERS);
    }

    const benefits = await LoyaltyTierService.getTierBenefits(userId);

    return activeOffers.filter((offer) => {
      if (offer.targetType === OfferTargetType.ALL_CUSTOMERS) return true;
      if (offer.targetType === OfferTargetType.LOYALTY_TIER) {
        return offer.targetTierId ? offer.targetTierId === benefits.tierName : benefits.rank >= (offer.targetTier?.rank || 1);
      }
      return true;
    });
  }
}
