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

  describe('ticking lines as packed', () => {
    it('sends only the ticked lines', () => {
      quantities.setPacked(1, true);

      expect(quantities.payload()).toEqual({
        packedLines: [{ index: 1, productId: 'p2' }],
      });
      expect(quantities.packedCount()).toBe(1);
    });

    // A click is a finished decision, so the preview follows at once.
    it('rebuilds the preview straight away', () => {
      quantities.setPacked(0, true);

      expect(changes).toBe(1);
    });

    // A tick on a line that is not in the parcel has nowhere to print.
    it('drops the tick of a line set to 0', () => {
      quantities.setPacked(1, true);
      quantities.setPending(1, 0);
      quantities.commit();

      expect(quantities.payload().packedLines).toBeUndefined();
    });

    it('ticks every line on the slip, and knows when all are ticked', () => {
      quantities.setPending(1, 0);
      quantities.commit();
      quantities.setAllPacked(true);

      expect(quantities.allPacked()).toBeTrue();
      expect(quantities.payload().packedLines).toEqual([{ index: 0, productId: 'p1' }]);
    });

    it('sends quantities and ticks together', () => {
      quantities.setPending(0, 20);
      quantities.commit();
      quantities.setPacked(0, true);

      expect(quantities.payload()).toEqual({
        lineQuantities: [{ index: 0, productId: 'p1', quantity: 20 }],
        packedLines: [{ index: 0, productId: 'p1' }],
      });
    });
  });
});
