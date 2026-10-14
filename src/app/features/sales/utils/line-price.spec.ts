import { signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { LightProduct } from '@features/products/models/product.model';
import { InvoiceCurrency, PriceType } from '../models/sale.model';
import { LinePrice } from './line-price';

const product = (over: Partial<LightProduct> = {}): LightProduct =>
  ({ id: 'p1', name: 'Shea Butter', wholesale: 40, retail: 60, ...over }) as LightProduct;

const build = (
  currency?: InvoiceCurrency,
  over: { price?: number; quantity?: number; type?: PriceType; product?: LightProduct | null } = {},
): {
  line: LinePrice;
  customPrice: FormControl<number | undefined | null>;
} => {
  const customPrice = new FormControl<number | undefined | null>(over.price);
  const quantity = new FormControl<number | null>(over.quantity ?? 1);
  const priceType = new FormControl<PriceType | null>(over.type ?? 'wholesale');
  const line = new LinePrice(
    customPrice,
    quantity,
    priceType,
    signal(over.product === undefined ? product() : over.product),
    signal(currency),
  );

  return { line, customPrice };
};

describe('LinePrice', () => {
  describe('on an ordinary cedi sale', () => {
    it('fills the price in from the catalogue', () => {
      const { line, customPrice } = build();

      line.fillFromCatalogue();

      expect(customPrice.value).toBe(40);
    });

    it('takes the retail price when that is the chosen type', () => {
      const { line, customPrice } = build(undefined, { type: 'retail' });

      line.fillFromCatalogue();

      expect(customPrice.value).toBe(60);
    });

    /* Typing then changing product must not have your figure overwritten. */
    it('leaves a price that has already been typed', () => {
      const { line, customPrice } = build(undefined, { price: 55 });

      line.fillIfEmpty();

      expect(customPrice.value).toBe(55);
    });

    it('fills in when the line has no price yet', () => {
      const { line, customPrice } = build();

      line.fillIfEmpty();

      expect(customPrice.value).toBe(40);
    });
  });

  describe('on a sale agreed in another currency', () => {
    /* The catalogue is priced in cedis. Dropping 40 into a line denominated
       in Canadian dollars reads as a plausible price while being out by the
       exchange rate — and the negotiated price is not the shelf price
       converted either, so there is nothing safe to prefill. */
    it('does not fill the price in from the cedi catalogue', () => {
      const { line, customPrice } = build(InvoiceCurrency.CAD);

      line.fillFromCatalogue();

      // Still exactly as the control started: nothing was written to it.
      expect(customPrice.value).toBeNull();
    });

    it('does not fill in on an empty line either', () => {
      const { line, customPrice } = build(InvoiceCurrency.USD);

      line.fillIfEmpty();

      expect(customPrice.value).toBeNull();
    });

    it('still uses a price that was typed', () => {
      const { line } = build(InvoiceCurrency.CAD, { price: 250, quantity: 4 });

      expect(line.total()).toBe(1000);
    });

    /* With nothing typed there is no price to fall back to, so the line is
       worth nothing until someone enters one. Showing the cedi figure here
       would be the same mistake in a different place. */
    it('totals to zero until a price is entered', () => {
      const { line } = build(InvoiceCurrency.CAD, { quantity: 4 });

      expect(line.total()).toBe(0);
    });

    it('reports itself as foreign and labels with the currency code', () => {
      const { line } = build(InvoiceCurrency.CAD);

      expect(line.isForeign()).toBe(true);
      expect(line.symbol()).toBe('CAD');
    });
  });

  describe('the total', () => {
    it('multiplies the typed price by the quantity', () => {
      expect(build(undefined, { price: 25, quantity: 4 }).line.total()).toBe(100);
    });

    it('falls back to the catalogue price on a cedi sale', () => {
      expect(build(undefined, { quantity: 3 }).line.total()).toBe(120);
    });

    it('is zero with no product chosen', () => {
      expect(build(undefined, { product: null, quantity: 3 }).line.total()).toBe(0);
    });
  });

  it('labels a cedi sale with the cedi sign and is not foreign', () => {
    const { line } = build(InvoiceCurrency.GHS);

    expect(line.symbol()).toBe('GH₵');
    expect(line.isForeign()).toBe(false);
  });

  /* An existing sale loaded before its currency arrives, and every sale that
     predates the column, must behave exactly as they always did. */
  it('treats an unknown currency as cedis', () => {
    const { line, customPrice } = build(undefined);

    expect(line.isForeign()).toBe(false);
    line.fillFromCatalogue();
    expect(customPrice.value).toBe(40);
  });
});
