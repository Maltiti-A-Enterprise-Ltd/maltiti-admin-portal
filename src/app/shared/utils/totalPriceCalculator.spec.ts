import {
  lineItemPremium,
  lineItemsPremiumTotal,
  lineItemsTotalPrice,
  lineItemTotalPrice,
} from './totalPriceCalculator';
import { PremiumType, SaleLineItemDto } from '@features/sales/models/sale.model';

const line = (over: Partial<SaleLineItemDto> = {}): SaleLineItemDto =>
  ({
    productId: 'p1',
    batchAllocations: [],
    requestedQuantity: 10,
    finalPrice: 100,
    ...over,
  }) as SaleLineItemDto;

describe('lineItemTotalPrice', () => {
  it('is quantity times price', () => {
    expect(lineItemTotalPrice(line())).toBe(1000);
  });

  it('prefers a custom price over the final one', () => {
    expect(lineItemTotalPrice(line({ customPrice: 90 }))).toBe(900);
  });

  /* The price alone, with no premium — that is what keeps the invoice's
     Subtotal line meaning what it says. */
  it('leaves the premium out', () => {
    expect(
      lineItemTotalPrice(
        line({ premiumType: PremiumType.AMOUNT, premiumValue: 50 }),
      ),
    ).toBe(1000);
  });
});

describe('lineItemPremium', () => {
  it('is nothing on an ordinary line', () => {
    expect(lineItemPremium(line())).toBe(0);
  });

  it('charges a cash premium per unit', () => {
    expect(
      lineItemPremium(
        line({ premiumType: PremiumType.AMOUNT, premiumValue: 50 }),
      ),
    ).toBe(500);
  });

  it('charges a percentage off the line total', () => {
    expect(
      lineItemPremium(
        line({ premiumType: PremiumType.PERCENT, premiumValue: 10 }),
      ),
    ).toBe(100);
  });

  it('follows the custom price when there is one', () => {
    expect(
      lineItemPremium(
        line({
          customPrice: 50,
          premiumType: PremiumType.PERCENT,
          premiumValue: 10,
        }),
      ),
    ).toBe(50);
  });
});

describe('lineItemsTotalPrice', () => {
  /*
   * The premium has to be in here. This feeds the "Total Amount" an admin
   * reads while building the sale, and the server adds premiums to the
   * grand total the customer is invoiced for — a figure on screen that
   * left them out would be quietly lower than the one that goes out.
   */
  it('includes the premiums', () => {
    expect(
      lineItemsTotalPrice([
        line({ premiumType: PremiumType.AMOUNT, premiumValue: 50 }),
        line(),
      ]),
    ).toBe(2500);
  });

  it('is unchanged for a sale with no premiums', () => {
    expect(lineItemsTotalPrice([line(), line()])).toBe(2000);
  });

  it('adds both forms together', () => {
    expect(
      lineItemsTotalPrice([
        line({ premiumType: PremiumType.AMOUNT, premiumValue: 50 }),
        line({ premiumType: PremiumType.PERCENT, premiumValue: 10 }),
      ]),
    ).toBe(2600);
  });

  it('is nothing for an empty sale', () => {
    expect(lineItemsTotalPrice([])).toBe(0);
  });
});

describe('lineItemsPremiumTotal', () => {
  it('counts only the premiums', () => {
    expect(
      lineItemsPremiumTotal([
        line({ premiumType: PremiumType.AMOUNT, premiumValue: 50 }),
        line(),
      ]),
    ).toBe(500);
  });

  it('is zero when no line carries one', () => {
    expect(lineItemsPremiumTotal([line(), line()])).toBe(0);
  });
});
