import { PackingSlipQuantities } from './packing-slip-quantities';
import { SaleLineItem } from '../models/sale.model';

describe('PackingSlipQuantities', () => {
  const items = [
    { productId: 'p1', productName: 'Shea Butter', requestedQuantity: 40 },
    { productId: 'p2', productName: 'Dawadawa', requestedQuantity: 10 },
  ] as SaleLineItem[];

  let quantities: PackingSlipQuantities;
  let changes: number;

  beforeEach(() => {
    quantities = new PackingSlipQuantities();
    changes = 0;
    quantities.onChange = (): void => {
      changes += 1;
    };
    quantities.reset(items);
  });

  it('opens on the full order and sends nothing extra', () => {
    expect(quantities.isPartial()).toBeFalse();
    expect(quantities.payload()).toEqual({});
  });

  it('sends only the lines that differ', () => {
    quantities.setPending(0, 20);
    quantities.commit();

    expect(quantities.payload()).toEqual({
      lineQuantities: [{ index: 0, productId: 'p1', quantity: 20 }],
    });
    expect(changes).toBe(1);
  });

  // Typing should not cost a server round trip per digit.
  it('rebuilds the preview on commit, not while typing', () => {
    quantities.setPending(0, 2);
    quantities.setPending(0, 20);

    expect(changes).toBe(0);
  });

  it('does not rebuild when a field is left unchanged', () => {
    quantities.commit();

    expect(changes).toBe(0);
  });

  // The API refuses more than the order holds; catch it before asking.
  it('keeps a quantity between 0 and what was ordered', () => {
    quantities.setPending(0, 99);
    expect(quantities.lines()[0].shipping).toBe(40);

    quantities.setPending(0, -5);
    expect(quantities.lines()[0].shipping).toBe(0);
  });

  it('knows when every line has been left off, and does not preview it', () => {
    quantities.setPending(0, 0);
    quantities.setPending(1, 0);
    quantities.commit();

    expect(quantities.isEmpty()).toBeTrue();
    expect(changes).toBe(0);
  });

  it('goes back to the full order', () => {
    quantities.setPending(1, 0);
    quantities.commit();
    quantities.clear();

    expect(quantities.isPartial()).toBeFalse();
    expect(quantities.payload()).toEqual({});
    expect(changes).toBe(2);
  });
});
