import { signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { LightProduct, UnitOfMeasurement } from '@features/products/models/product.model';
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

  describe('the rate per kilogram or litre', () => {
    const sized = (
      weight: string,
      unitOfMeasurement: UnitOfMeasurement,
      over: { price?: number; currency?: InvoiceCurrency; type?: PriceType } = {},
    ): LinePrice =>
      build(over.currency, {
        price: over.price,
        type: over.type,
        product: product({ weight, unitOfMeasurement }),
      }).line;

    it('divides the typed price by the size of one unit', () => {
      const line = sized('25', UnitOfMeasurement.KILOGRAM, { price: 60 });

      expect(line.perBulkUnit()).toBe('GH₵ 2.40 / kg');
    });

    /* Nobody prices a tub in grams, but comparing a 500 g tub against a 25 kg
       sack is the whole point — so grams roll up to the kilogram. */
    it('rolls grams up to a price per kilogram', () => {
      const line = sized('500', UnitOfMeasurement.GRAM, { price: 4.5 });

      expect(line.perBulkUnit()).toBe('GH₵ 9.00 / kg');
    });

    it('prices a volume per litre, not per kilogram', () => {
      const line = sized('5', UnitOfMeasurement.LITRE, { price: 75 });

      expect(line.perBulkUnit()).toBe('GH₵ 15.00 / L');
    });

    it('rolls millilitres up to a price per litre', () => {
      const line = sized('250', UnitOfMeasurement.MILLILITRE, { price: 6 });

      expect(line.perBulkUnit()).toBe('GH₵ 24.00 / L');
    });

    /* Falling back to the shelf price is what the line itself charges, so the
       rate has to follow it — otherwise it reads as 0 until someone types. */
    it('uses the catalogue price when none was typed', () => {
      const line = sized('25', UnitOfMeasurement.KILOGRAM);

      expect(line.perBulkUnit()).toBe('GH₵ 1.60 / kg');
    });

    it('follows the retail price when that is the chosen type', () => {
      const line = sized('25', UnitOfMeasurement.KILOGRAM, { type: 'retail' });

      expect(line.perBulkUnit()).toBe('GH₵ 2.40 / kg');
    });

    it('labels the rate in the currency the sale was agreed in', () => {
      const line = sized('25', UnitOfMeasurement.KILOGRAM, {
        price: 250,
        currency: InvoiceCurrency.CAD,
      });

      expect(line.perBulkUnit()).toBe('CAD 10.00 / kg');
    });

    /* A bar of soap sold by the piece has no weight recorded, and inventing a
       rate for it would be worse than showing none. */
    it('shows nothing for a product that records no size', () => {
      expect(build(undefined, { price: 60 }).line.perBulkUnit()).toBeNull();
    });

    it('shows nothing with no product chosen', () => {
      expect(build(undefined, { product: null, price: 60 }).line.perBulkUnit()).toBeNull();
    });

    /* A foreign line starts empty — see above — so there is no price to
       divide until one is agreed and typed. */
    it('shows nothing before a price exists on a foreign line', () => {
      const line = sized('25', UnitOfMeasurement.KILOGRAM, { currency: InvoiceCurrency.CAD });

      expect(line.perBulkUnit()).toBeNull();
    });

    it('is not fooled by a weight of zero', () => {
      const line = sized('0', UnitOfMeasurement.KILOGRAM, { price: 60 });

      expect(line.perBulkUnit()).toBeNull();
    });

    /* "0.00 / kg" is true to the arithmetic and useless on the screen. */
    it('keeps more decimals when the rate is under a pesewa', () => {
      const line = sized('1000', UnitOfMeasurement.KILOGRAM, { price: 5 });

      expect(line.perBulkUnit()).toBe('GH₵ 0.005 / kg');
    });

    /* Pounds convert rather than getting a "/ lb" of their own, matching how
       the total-weight field already treats them. One rate per product means
       two products can be compared; two rates means they cannot. */
    it('converts a weight given in pounds to a price per kilogram', () => {
      const line = sized('5', UnitOfMeasurement.POUND, { price: 50 });

      expect(line.perBulkUnit()).toBe('GH₵ 22.05 / kg');
    });
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
