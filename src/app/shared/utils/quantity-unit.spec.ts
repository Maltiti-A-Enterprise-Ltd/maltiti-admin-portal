import { QuantityUnit } from '@features/products/models/product.model';
import {
  formatQuantity,
  QUANTITY_UNIT_OPTIONS,
  quantityUnitLabel,
} from './quantity-unit';

describe('quantityUnitLabel', () => {
  /* The point of the whole thing: "1 pieces" is how a system looks unfinished
     to whoever is reading an order back down the phone. */
  it('uses the singular for exactly one', () => {
    expect(quantityUnitLabel(1, QuantityUnit.PIECE)).toBe('piece');
  });

  it('uses the plural for more than one', () => {
    expect(quantityUnitLabel(11, QuantityUnit.PIECE)).toBe('pieces');
  });

  /* "0 boxes", as English does it. */
  it('uses the plural for none', () => {
    expect(quantityUnitLabel(0, QuantityUnit.BOX)).toBe('boxes');
  });

  /* No rule covers every case — box takes "es", jerry can is two words — so
     each pair is checked rather than trusted to a suffix. */
  const pairs: [QuantityUnit, string, string][] = [
    [QuantityUnit.PIECE, 'piece', 'pieces'],
    [QuantityUnit.BOX, 'box', 'boxes'],
    [QuantityUnit.CARTON, 'carton', 'cartons'],
    [QuantityUnit.BAG, 'bag', 'bags'],
    [QuantityUnit.SACHET, 'sachet', 'sachets'],
    [QuantityUnit.BOTTLE, 'bottle', 'bottles'],
    [QuantityUnit.GALLON, 'gallon', 'gallons'],
    [QuantityUnit.JERRY_CAN, 'jerry can', 'jerry cans'],
    [QuantityUnit.JAR, 'jar', 'jars'],
    [QuantityUnit.TUB, 'tub', 'tubs'],
    [QuantityUnit.DRUM, 'drum', 'drums'],
    [QuantityUnit.KEG, 'keg', 'kegs'],
    [QuantityUnit.PALLET, 'pallet', 'pallets'],
    [QuantityUnit.BUCKET, 'bucket', 'buckets'],
  ];

  pairs.forEach(([unit, singular, plural]) => {
    it(`renders ${unit} as "${singular}" / "${plural}"`, () => {
      expect(quantityUnitLabel(1, unit)).toBe(singular);
      expect(quantityUnitLabel(2, unit)).toBe(plural);
    });
  });

  /* Products predating the field, and anything the API could not load, are
     counted in pieces — the same fallback the backend applies. */
  const missing: [string, QuantityUnit | null | undefined][] = [
    ['null', null],
    ['undefined', undefined],
  ];

  missing.forEach(([label, unit]) => {
    it(`falls back to pieces for a ${label} unit`, () => {
      expect(quantityUnitLabel(1, unit)).toBe('piece');
      expect(quantityUnitLabel(3, unit)).toBe('pieces');
    });
  });

  it('falls back to pieces for a unit it does not know', () => {
    expect(quantityUnitLabel(1, 'crate' as QuantityUnit)).toBe('piece');
  });

  /* A negative quantity is nonsense on an order, but a correction could show
     one, and "-1 pieces" would be wrong twice over. */
  it('agrees with the magnitude, not the sign', () => {
    expect(quantityUnitLabel(-1, QuantityUnit.BOX)).toBe('box');
  });
});

describe('formatQuantity', () => {
  it('puts the number with the thing it counts', () => {
    expect(formatQuantity(4, QuantityUnit.BOX)).toBe('4 boxes');
  });

  it('agrees in number', () => {
    expect(formatQuantity(1, QuantityUnit.BOX)).toBe('1 box');
  });

  it('groups thousands, since an order can run to hundreds of tubs', () => {
    expect(formatQuantity(1500, QuantityUnit.TUB)).toBe('1,500 tubs');
  });

  const empty: [string, number | null | undefined][] = [
    ['null', null],
    ['undefined', undefined],
  ];

  empty.forEach(([label, quantity]) => {
    it(`reads ${label} as none rather than printing it`, () => {
      expect(formatQuantity(quantity, QuantityUnit.PIECE)).toBe('0 pieces');
    });
  });
});

describe('QUANTITY_UNIT_OPTIONS', () => {
  /* Derived from the same table, so a unit cannot be added to one and
     forgotten in the other — which is exactly how Buckets would have ended up
     selectable nowhere. */
  it('offers every unit', () => {
    expect(QUANTITY_UNIT_OPTIONS.map((option) => option.value)).toEqual(
      Object.values(QuantityUnit),
    );
  });

  it('labels them in the plural, title-cased, as a category reads', () => {
    expect(QUANTITY_UNIT_OPTIONS).toContain({ label: 'Boxes', value: QuantityUnit.BOX });
    expect(QUANTITY_UNIT_OPTIONS).toContain({
      label: 'Jerry Cans',
      value: QuantityUnit.JERRY_CAN,
    });
  });

  it('includes buckets', () => {
    expect(QUANTITY_UNIT_OPTIONS).toContain({
      label: 'Buckets',
      value: QuantityUnit.BUCKET,
    });
  });
});
