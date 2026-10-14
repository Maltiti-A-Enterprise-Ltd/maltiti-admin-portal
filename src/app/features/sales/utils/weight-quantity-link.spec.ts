import { signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { UnitOfMeasurement } from '@features/products/models/product.model';
import { unitSizeInBulk, WeighedProduct, WeightQuantityLink } from './weight-quantity-link';

const product = (over: Partial<WeighedProduct> = {}): WeighedProduct => ({
  weight: '500',
  unitOfMeasurement: UnitOfMeasurement.GRAM,
  ...over,
});

describe('unitSizeInBulk', () => {
  /* Bulk orders are not spoken about in the product's own unit — nobody asks
     for 250,000 g — so mass rolls up to kilograms and volume to litres. */
  const sizeCases: [string, Partial<WeighedProduct>, number, string][] = [
    ['500 g', { weight: '500', unitOfMeasurement: UnitOfMeasurement.GRAM }, 0.5, 'kg'],
    ['1 kg', { weight: '1', unitOfMeasurement: UnitOfMeasurement.KILOGRAM }, 1, 'kg'],
    ['2 lb', { weight: '2', unitOfMeasurement: UnitOfMeasurement.POUND }, 0.90718474, 'kg'],
    ['1 L', { weight: '1', unitOfMeasurement: UnitOfMeasurement.LITRE }, 1, 'L'],
    ['250 ml', { weight: '250', unitOfMeasurement: UnitOfMeasurement.MILLILITRE }, 0.25, 'L'],
  ];

  sizeCases.forEach(([label, over, size, unit]) => {
    it(`sizes ${label} as ${size} ${unit}`, () => {
      const bulk = unitSizeInBulk(product(over));

      expect(bulk.size).toBeCloseTo(size, 6);
      expect(bulk.label).toBe(unit);
    });
  });

  /* Volume stays in litres rather than being converted to kilograms: an order
     for soap is placed in litres whatever the shipping weight says. */
  it('keeps volume in litres rather than applying the 1L = 1kg rule', () => {
    expect(unitSizeInBulk(product({ unitOfMeasurement: UnitOfMeasurement.LITRE })).label).toBe('L');
  });

  const unsized: [string, Partial<WeighedProduct>][] = [
    ['no weight', { weight: null }],
    ['a blank weight', { weight: '' }],
    ['a zero weight', { weight: '0' }],
    ['a non-numeric weight', { weight: 'one kilo' }],
    ['no unit', { unitOfMeasurement: null }],
  ];

  unsized.forEach(([label, over]) => {
    it(`has no size for a product with ${label}`, () => {
      expect(unitSizeInBulk(product(over)).size).toBe(0);
    });
  });

  it('has no size with no product at all', () => {
    expect(unitSizeInBulk(null).size).toBe(0);
  });
});

describe('WeightQuantityLink', () => {
  const build = (
    over: Partial<WeighedProduct> = {},
  ): { link: WeightQuantityLink; quantity: FormControl<number | null> } => {
    const quantity = new FormControl<number | null>(null);
    const link = new WeightQuantityLink(quantity, signal(product(over)));

    TestBed.runInInjectionContext(() => link.connect());

    return { link, quantity };
  };

  describe('when it is offered', () => {
    it('is offered for a loose product with a size', () => {
      expect(build().link.isWeighed()).toBe(true);
    });

    /* Where both apply the box count wins: that is how the order is picked,
       and two helper fields driving one quantity would be ambiguous. */
    it('is not offered when the product is sold by the box', () => {
      expect(build({ quantityInBox: 12 }).link.isWeighed()).toBe(false);
    });

    it('is still offered when a box holds one, since that is not really boxed', () => {
      expect(build({ quantityInBox: 1 }).link.isWeighed()).toBe(true);
    });

    it('is not offered when the product records no size', () => {
      expect(build({ weight: null }).link.isWeighed()).toBe(false);
    });
  });

  describe('typing a total', () => {
    it('works out the quantity from the size of one', () => {
      const { link, quantity } = build();

      link.totalControl.setValue(250);

      expect(quantity.value).toBe(500);
    });

    it('handles a product sold by the kilo', () => {
      const { link, quantity } = build({
        weight: '1',
        unitOfMeasurement: UnitOfMeasurement.KILOGRAM,
      });

      link.totalControl.setValue(250);

      expect(quantity.value).toBe(250);
    });

    /*
     * You cannot ship two thirds of a tub, so 250 kg of a 1.5 kg product is
     * 167 units — really 250.5 kg. The typed figure is left alone rather than
     * corrected under the cursor, and `actualTotal` carries the truth so the
     * rounding is visible rather than discovered on the invoice.
     */
    it('rounds to a whole quantity and reports what it really comes to', () => {
      const { link, quantity } = build({
        weight: '1.5',
        unitOfMeasurement: UnitOfMeasurement.KILOGRAM,
      });

      link.totalControl.setValue(250);

      expect(quantity.value).toBe(167);
      expect(link.totalControl.value).toBe(250);
      expect(link.actualTotal()).toBe(250.5);
    });

    it('reports the same figure back when it divides exactly', () => {
      const { link } = build();

      link.totalControl.setValue(250);

      expect(link.actualTotal()).toBe(250);
    });

    /* Rounding down would empty the line, which is never what was meant. */
    it('gives one unit for a total smaller than a single unit', () => {
      const { link, quantity } = build({
        weight: '5',
        unitOfMeasurement: UnitOfMeasurement.KILOGRAM,
      });

      link.totalControl.setValue(1);

      expect(quantity.value).toBe(1);
    });
  });

  describe('typing a quantity', () => {
    it('shows what that quantity comes to', () => {
      const { link, quantity } = build();

      quantity.setValue(500);

      expect(link.totalControl.value).toBe(250);
    });

    it('clears the total when the quantity is cleared', () => {
      const { link, quantity } = build();

      quantity.setValue(100);
      quantity.setValue(null);

      expect(link.totalControl.value).toBeNull();
    });

    /* Without the guard each control would rewrite the other for ever. */
    it('settles instead of looping between the two fields', () => {
      const { link, quantity } = build();

      link.totalControl.setValue(250);

      expect(quantity.value).toBe(500);
      expect(link.totalControl.value).toBe(250);
    });
  });
});
