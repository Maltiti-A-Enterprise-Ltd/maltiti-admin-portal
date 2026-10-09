import { SaleLineItemDto } from '../models/sale.model';
import { summariseLineItems } from './line-item-summary';

const item = (overrides: Partial<SaleLineItemDto> = {}): SaleLineItemDto =>
  ({
    productId: 'product-1',
    requestedQuantity: 1,
    batchAllocations: [],
    ...overrides,
  }) as SaleLineItemDto;

describe('summariseLineItems', () => {
  it('counts nothing for an empty sale', () => {
    expect(summariseLineItems([])).toEqual({ productCount: 0, totalQuantity: 0 });
  });

  it('counts one row as one product', () => {
    expect(summariseLineItems([item({ requestedQuantity: 20 })])).toEqual({
      productCount: 1,
      totalQuantity: 20,
    });
  });

  it('adds the quantities across rows', () => {
    const summary = summariseLineItems([
      item({ productId: 'a', requestedQuantity: 20 }),
      item({ productId: 'b', requestedQuantity: 30 }),
      item({ productId: 'c', requestedQuantity: 1 }),
    ]);

    expect(summary).toEqual({ productCount: 3, totalQuantity: 51 });
  });

  // Adding a product creates an empty row before anything is chosen. Counting
  // it would tell the user they have one more product than they do.
  it('ignores a row with no product chosen yet', () => {
    const summary = summariseLineItems([
      item({ productId: 'a', requestedQuantity: 20 }),
      item({ productId: '', requestedQuantity: 1 }),
    ]);

    expect(summary).toEqual({ productCount: 1, totalQuantity: 20 });
  });

  it('ignores a row whose product is missing entirely', () => {
    const summary = summariseLineItems([
      item({ productId: undefined as unknown as string }),
      item({ productId: 'a', requestedQuantity: 5 }),
    ]);

    expect(summary).toEqual({ productCount: 1, totalQuantity: 5 });
  });

  it('treats a missing quantity as none rather than NaN', () => {
    const summary = summariseLineItems([
      item({ productId: 'a', requestedQuantity: undefined as unknown as number }),
      item({ productId: 'b', requestedQuantity: 10 }),
    ]);

    expect(summary).toEqual({ productCount: 2, totalQuantity: 10 });
  });

  // The same product added twice is two rows on screen, so it reads as two.
  it('counts a repeated product once per row', () => {
    const summary = summariseLineItems([
      item({ productId: 'a', requestedQuantity: 2 }),
      item({ productId: 'a', requestedQuantity: 3 }),
    ]);

    expect(summary).toEqual({ productCount: 2, totalQuantity: 5 });
  });

  it('survives a null row', () => {
    const summary = summariseLineItems([
      null as unknown as SaleLineItemDto,
      item({ productId: 'a', requestedQuantity: 4 }),
    ]);

    expect(summary).toEqual({ productCount: 1, totalQuantity: 4 });
  });
});
