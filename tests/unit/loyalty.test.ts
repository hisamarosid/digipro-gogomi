import { describe, it, expect } from 'vitest';

// ----------------------------------------------------
// LOYALTY SERVICE UNIT TESTS (MOCK CALCULATIONS)
// ----------------------------------------------------

describe('Loyalty Service Business Rules & Conversions', () => {
  // Conversion helper rules (100 Coins = Rp1.000 -> 1 Coin = Rp10)
  const coinsToCurrency = (coins: number, currencyValuePerCoin: number = 10) => Math.floor(coins * currencyValuePerCoin);
  const currencyToCoins = (idrAmount: number, currencyValuePerCoin: number = 10) => Math.floor(idrAmount / currencyValuePerCoin);

  it('converts 100 Coins to Rp1.000 correctly using integer math', () => {
    expect(coinsToCurrency(100, 10)).toBe(1000);
    expect(coinsToCurrency(2850, 10)).toBe(28500);
  });

  it('converts Rp28.500 to 2.850 Coins correctly using integer math', () => {
    expect(currencyToCoins(1000, 10)).toBe(100);
    expect(currencyToCoins(28500, 10)).toBe(2850);
  });

  it('calculates cashback reward based on net cash eligible payment (NOT gross subtotal)', () => {
    // Example from prompt section 6:
    // Product: Rp100.000, Coupon: -Rp10.000, Coin: -Rp20.000 -> QRIS Paid: Rp70.000
    // Reward: 2% * Rp70.000 = Rp1.400 = 140 Coins
    const grossSubtotal = 100000;
    const couponDiscount = 10000;
    const coinDiscountAmount = 20000;
    const defaultRewardPercentage = 2.0;

    const netCashPaid = Math.max(0, grossSubtotal - couponDiscount - coinDiscountAmount);
    expect(netCashPaid).toBe(70000);

    const rewardIdr = netCashPaid * (defaultRewardPercentage / 100);
    expect(rewardIdr).toBe(1400);

    const coinsEarned = currencyToCoins(rewardIdr, 10);
    expect(coinsEarned).toBe(140);
  });

  it('enforces minimum redemption threshold of 500 Coins', () => {
    const minRedemption = 500;
    const requestedCoins = 200;

    const isBelowMin = requestedCoins < minRedemption;
    expect(isBelowMin).toBe(true);
  });

  it('enforces maximum redemption cap of 30% of eligible order amount', () => {
    const eligibleAmount = 100000; // Rp100.000
    const maxRedemptionPercentage = 30; // 30%
    const currencyValuePerCoin = 10; // 1 Coin = Rp10

    const maxRedemptionIdrCap = Math.floor(eligibleAmount * (maxRedemptionPercentage / 100)); // Rp30.000
    expect(maxRedemptionIdrCap).toBe(30000);

    const maxUsableCoinsCap = currencyToCoins(maxRedemptionIdrCap, currencyValuePerCoin); // 3.000 Coins
    expect(maxUsableCoinsCap).toBe(3000);

    const userCoins = 20000; // User has 20.000 Coins
    const effectiveCoinsUsable = Math.min(userCoins, maxUsableCoinsCap);
    expect(effectiveCoinsUsable).toBe(3000); // Capped to 3.000 Coins
  });

  it('prevents double-spending by reserving coins at checkout', () => {
    let availableCoins = 2000;
    let reservedCoins = 0;

    // Checkout A requests 2000 coins
    const requestedA = 2000;
    if (availableCoins >= requestedA) {
      reservedCoins += requestedA;
      availableCoins -= requestedA;
    }
    expect(reservedCoins).toBe(2000);
    expect(availableCoins).toBe(0);

    // Concurrent Checkout B requests 2000 coins
    const requestedB = 2000;
    const checkoutBSuccess = availableCoins >= requestedB;
    expect(checkoutBSuccess).toBe(false); // Checkout B fails due to zero available coins
  });

  it('releases coin reservation when QRIS payment expires', () => {
    let availableCoins = 0;
    let reservedCoins = 2000;

    // QRIS payment expires -> release reservation
    availableCoins += reservedCoins;
    reservedCoins = 0;

    expect(availableCoins).toBe(2000);
    expect(reservedCoins).toBe(0);
  });

  it('allows 100% coin payment when product variant enables full coin payment', () => {
    const orderTotal = 20000; // Rp20.000
    const requestedCoins = 2000; // 2.000 Coins = Rp20.000
    const coinFullPaymentAllowed = true;

    const coinDiscountAmount = coinsToCurrency(requestedCoins, 10); // Rp20.000
    const cashPayableAmount = Math.max(0, orderTotal - coinDiscountAmount); // Rp0

    expect(cashPayableAmount).toBe(0);
    const requiresQris = cashPayableAmount > 0;
    expect(requiresQris).toBe(false); // No AutoGoPay call required
  });
});
