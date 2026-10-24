import { InvoicePriceAdjustments } from './invoice-price-adjustments';
import { SaleLineItem } from '../models/sale.model';

/**
 * Printing an invoice at prices other than the sale's.
 *
 * Two things must hold. The payload has to reach both the preview and the
 * email — an adjusted price that reached one and not the other would send a
 * customer a different document from the one that was approved. And typing
 * must not rebuild the PDF on every keystroke.
 */
describe('InvoicePriceAdjustments', () => {
  let prices: InvoicePriceAdjustments;
  let regenerated: number;

  const lines = (): SaleLineItem[] =>
    [
      {
        productId: 'p1',
        productName: 'Shea Butter 500g',
        requestedQuantity: 40,
        finalPrice: 75,
      },
      {
        productId: 'p2',
        productName: 'Black Soap 250g',
        requestedQuantity: 20,
        finalPrice: 40,
      },
    ] as SaleLineItem[];

  beforeEach(() => {
    regenerated = 0;
    prices = new InvoicePriceAdjustments();
    prices.onChange = (): void => {
      regenerated += 1;
    };
    prices.reset(lines());
  });

  it('opens on the sale\'s own prices', () => {
    expect(prices.lines().map((l) => l.invoicePrice)).toEqual([75, 40]);
    expect(prices.isAdjusted()).toBeFalse();
  });

  it('totals both sides and the difference between them', () => {
    prices.setPending(0, 62);

    expect(prices.saleTotal()).toBe(3800);
    expect(prices.invoiceTotal()).toBe(3280);
    expect(prices.difference()).toBe(-520);
  });

  it('knows when a price has actually moved', () => {
    expect(prices.isAdjusted()).toBeFalse();

    prices.setPending(0, 62);

    expect(prices.isAdjusted()).toBeTrue();
  });

  /* A price retyped to the same figure is not an adjustment — and the API
     drops the payments section from an adjusted invoice, so losing it over a
     number nobody changed would be baffling. */
  it('is not adjusted by a price retyped to the same figure', () => {
    prices.setPending(0, 75);

    expect(prices.isAdjusted()).toBeFalse();
    expect(prices.payload()).toEqual({});
  });

  describe('rebuilding the preview', () => {
    /* A round trip per digit, and "6" on the way to "62" is a real price the
       preview would briefly show. */
    it('does not rebuild while a price is being typed', () => {
      prices.setPending(0, 6);
      prices.setPending(0, 62);

      expect(regenerated).toBe(0);
    });

    it('rebuilds once the field is left', () => {
      prices.setPending(0, 62);
      prices.commit();

      expect(regenerated).toBe(1);
    });

    it('does not rebuild when the field is left unchanged', () => {
      prices.commit();
      prices.setPending(0, 75);
      prices.commit();

      expect(regenerated).toBe(0);
    });

    it('rebuilds when the prices are put back', () => {
      prices.setPending(0, 62);
      prices.commit();
      prices.clear();

      expect(regenerated).toBe(2);
      expect(prices.isAdjusted()).toBeFalse();
    });
  });

  describe('the payload', () => {
    /* An ordinary invoice sends an ordinary request and keeps everything an
       ordinary invoice has. */
    it('sends nothing at all when nothing was changed', () => {
      expect(prices.payload()).toEqual({});
    });

    /* Every line, not only the changed one: the API matches by position, so
       a partial list would leave it guessing. */
    it('sends every line once anything is changed', () => {
      prices.setPending(0, 62);

      expect(prices.payload().lineItemPrices).toEqual([
        { index: 0, productId: 'p1', unitPrice: 62 },
        { index: 1, productId: 'p2', unitPrice: 40 },
      ]);
    });

    /* The API checks this against what it finds, so a wrong one is refused
       rather than silently pricing another product. */
    it('carries the product each price belongs to', () => {
      prices.setPending(1, 35);

      expect(
        prices.payload().lineItemPrices?.map((p) => p.productId),
      ).toEqual(['p1', 'p2']);
    });
  });

  it('rounds to the pesewa', () => {
    prices.setPending(0, 62.005);

    expect(prices.lines()[0].invoicePrice).toBe(62.01);
  });

  it('reads a cleared field as zero rather than breaking the total', () => {
    prices.setPending(0, null);

    expect(prices.lines()[0].invoicePrice).toBe(0);
    expect(prices.invoiceTotal()).toBe(800);
  });

  it('empties when the dialog is closed', () => {
    prices.reset();

    expect(prices.lines()).toEqual([]);
    expect(prices.payload()).toEqual({});
  });

  /* Reopening on another sale must not inherit the last one's prices. */
  it('starts afresh when reset on another sale', () => {
    prices.setPending(0, 62);
    prices.commit();
    prices.reset(lines());

    expect(prices.isAdjusted()).toBeFalse();
    expect(prices.lines()[0].invoicePrice).toBe(75);
  });

  it('names a product it cannot name', () => {
    prices.reset([
      { productId: 'p9', requestedQuantity: 1, finalPrice: 10 } as SaleLineItem,
    ]);

    expect(prices.lines()[0].productName).toBe('Unknown product');
  });
});
