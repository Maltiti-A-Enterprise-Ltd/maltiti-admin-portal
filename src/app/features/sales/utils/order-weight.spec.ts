import {
  isWeightPartial,
  lineItemsWeightKg,
  orderWeightLabel,
  weightCaveat,
} from './order-weight';
import { LightProduct, UnitOfMeasurement } from '@features/products/models/product.model';
import { SaleLineItemDto } from '../models/sale.model';

describe('orderWeightLabel', () => {
  it('writes the weight with its unit', () => {
    expect(orderWeightLabel({ totalWeightKg: 5.5 })).toBe('5.5 kg');
  });

  it('drops trailing zeros rather than padding to a fixed width', () => {
    expect(orderWeightLabel({ totalWeightKg: 12 })).toBe('12 kg');
  });

  it('keeps precision down to the gram', () => {
    expect(orderWeightLabel({ totalWeightKg: 0.125 })).toBe('0.125 kg');
  });

  it('groups thousands so a big shipment stays readable', () => {
    expect(orderWeightLabel({ totalWeightKg: 1250 })).toBe('1,250 kg');
  });

  /*
   * The API omits the figure rather than sending 0 when nothing could be
   * weighed, and the two mean different things: printing "0 kg" would tell an
   * admin the order weighs nothing.
   */
  it('shows a dash when the API sent no weight', () => {
    expect(orderWeightLabel({ totalWeightKg: undefined })).toBe('—');
  });

  it('shows a dash for a null weight too', () => {
    expect(orderWeightLabel({ totalWeightKg: null as unknown as number })).toBe('—');
  });

  // An order really can weigh nothing much; that is not the same as unknown.
  it('still prints a genuine zero', () => {
    expect(orderWeightLabel({ totalWeightKg: 0 })).toBe('0 kg');
  });
});

describe('isWeightPartial', () => {
  it('is false when every line was weighed', () => {
    expect(isWeightPartial({ unweighedLineItems: 0 })).toBe(false);
  });

  it('is false when the API said nothing about it', () => {
    expect(isWeightPartial({ unweighedLineItems: undefined })).toBe(false);
  });

  it('is true as soon as one line is missing', () => {
    expect(isWeightPartial({ unweighedLineItems: 1 })).toBe(true);
  });
});

describe('weightCaveat', () => {
  it('says nothing when the total is complete', () => {
    expect(weightCaveat({ unweighedLineItems: 0 })).toBe('');
  });

  it('agrees in number for a single item', () => {
    expect(weightCaveat({ unweighedLineItems: 1 })).toContain('1 item is not included');
  });

  it('agrees in number for several', () => {
    expect(weightCaveat({ unweighedLineItems: 3 })).toContain('3 items are not included');
  });

  /*
   * Every unit in the catalogue converts now, so the only remaining cause is
   * missing product data — and that is fixable, so the message says where.
   */
  it('names the one remaining cause', () => {
    expect(weightCaveat({ unweighedLineItems: 2 })).toContain(
      'no size or unit recorded on the product',
    );
  });

  it('tells the admin what to do about it', () => {
    const caveat = weightCaveat({ unweighedLineItems: 2 });

    expect(caveat).toContain('Set it on the product');
    expect(caveat).toContain('before quoting a courier');
  });
});

describe('lineItemsWeightKg', () => {
  const product = (over: Partial<LightProduct>): LightProduct =>
    ({ id: 'p1', weight: '1', unitOfMeasurement: UnitOfMeasurement.KILOGRAM, ...over }) as LightProduct;

  const line = (productId: string, requestedQuantity: number): SaleLineItemDto =>
    ({ productId, requestedQuantity, batchAllocations: [] }) as SaleLineItemDto;

  it('multiplies size by quantity', () => {
    expect(lineItemsWeightKg([line('p1', 3)], [product({ weight: '5' })])).toEqual({
      totalWeightKg: 15,
      unweighedLineItems: 0,
    });
  });

  it('converts grams', () => {
    const weight = lineItemsWeightKg(
      [line('p1', 11)],
      [product({ weight: '500', unitOfMeasurement: UnitOfMeasurement.GRAM })],
    );

    expect(weight.totalWeightKg).toBe(5.5);
  });

  // The company rule: one litre is declared as one kilogram.
  it('converts litres at one to one', () => {
    const weight = lineItemsWeightKg(
      [line('p1', 6)],
      [product({ weight: '1', unitOfMeasurement: UnitOfMeasurement.LITRE })],
    );

    expect(weight.totalWeightKg).toBe(6);
  });

  it('converts pounds at the defined factor', () => {
    const weight = lineItemsWeightKg(
      [line('p1', 10)],
      [product({ weight: '2', unitOfMeasurement: UnitOfMeasurement.POUND })],
    );

    expect(weight.totalWeightKg).toBe(9.072);
  });

  /*
   * This must agree with the backend, which is the authority. If the two ever
   * disagree, the figure changes the moment a sale is saved.
   */
  Object.values(UnitOfMeasurement).forEach((unit) => {
    it(`can weigh a product measured in ${unit}`, () => {
      const weight = lineItemsWeightKg([line('p1', 1)], [product({ unitOfMeasurement: unit })]);

      expect(weight.unweighedLineItems).toBe(0);
      expect(weight.totalWeightKg).toBeGreaterThan(0);
    });
  });

  /*
   * Adding a product creates an empty row before anything is chosen. Counting
   * that as unweighable would warn about a row the user has not filled in yet.
   */
  it('ignores a row with no product chosen', () => {
    expect(lineItemsWeightKg([line('', 3)], [product({})])).toEqual({
      totalWeightKg: undefined,
      unweighedLineItems: 0,
    });
  });

  it('counts a line whose product records no size', () => {
    const weight = lineItemsWeightKg([line('p1', 3)], [product({ weight: null as unknown as string })]);

    expect(weight).toEqual({ totalWeightKg: undefined, unweighedLineItems: 1 });
  });

  it('still totals what it can alongside one it cannot', () => {
    const weight = lineItemsWeightKg(
      [line('p1', 2), line('p2', 4)],
      [product({ weight: '1' }), product({ id: 'p2', weight: null as unknown as string })],
    );

    expect(weight).toEqual({ totalWeightKg: 2, unweighedLineItems: 1 });
  });

  it('counts a line whose product is not loaded', () => {
    expect(lineItemsWeightKg([line('missing', 2)], [])).toEqual({
      totalWeightKg: undefined,
      unweighedLineItems: 1,
    });
  });

  it('treats a missing quantity as none rather than failing', () => {
    const weight = lineItemsWeightKg(
      [{ productId: 'p1', batchAllocations: [] } as unknown as SaleLineItemDto],
      [product({ weight: '2' })],
    );

    expect(weight.totalWeightKg).toBe(0);
  });
});
