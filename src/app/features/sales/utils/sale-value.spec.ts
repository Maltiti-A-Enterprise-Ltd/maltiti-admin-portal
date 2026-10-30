import { saleValue } from './sale-value';
import { Sale } from '../models/sale.model';
import { SaleKind } from '../models/opening-balance.model';

/**
 * Every total on the register is summed from the line items, which gives
 * nothing for a debt carried in from before this system — an opening
 * balance has no lines, because the amount owed is the whole record. The
 * list showed a customer who owes GHS 4,500 against a total of 0.00.
 */
describe('saleValue', () => {
  const order = (over: Partial<Sale> = {}): Sale =>
    ({
      kind: SaleKind.ORDER,
      amount: 999,
      lineItems: [
        { productId: 'p1', requestedQuantity: 4, finalPrice: 75 },
        { productId: 'p2', requestedQuantity: 2, finalPrice: 40 },
      ],
      ...over,
    }) as unknown as Sale;

  const openingBalance = (over: Partial<Sale> = {}): Sale =>
    ({
      kind: SaleKind.OPENING_BALANCE,
      amount: 4500,
      lineItems: [],
      ...over,
    }) as unknown as Sale;

  it('is what is owed on a debt brought forward', () => {
    expect(saleValue(openingBalance())).toBe(4500);
  });

  it('adds an order up from its lines', () => {
    expect(saleValue(order())).toBe(380);
  });

  /* The stored amount is deliberately ignored for an order: the lines are
     what the customer is invoiced from, and they stay right when one is
     edited. */
  it('does not read an order total off the stored amount', () => {
    expect(saleValue(order({ amount: 999 } as Partial<Sale>))).toBe(380);
  });

  it('is nothing for an order with no lines yet', () => {
    expect(saleValue(order({ lineItems: [] } as Partial<Sale>))).toBe(0);
  });

  /* Sales loaded from some endpoints arrive without the array at all. */
  it('copes with a sale that has no line items property', () => {
    expect(
      saleValue({ kind: SaleKind.ORDER } as unknown as Sale),
    ).toBe(0);
  });

  it('reads an opening balance stored as a string', () => {
    expect(
      saleValue(openingBalance({ amount: '4500' } as unknown as Partial<Sale>)),
    ).toBe(4500);
  });

  /* A sale recorded before `kind` existed is an ordinary order. */
  it('treats a sale with no kind as an order', () => {
    expect(saleValue(order({ kind: undefined } as Partial<Sale>))).toBe(380);
  });
});
