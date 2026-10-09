import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { calculateInBoxPrice, InBoxPriceLink } from './in-box-price-link';

describe('calculateInBoxPrice', () => {
  it('multiplies the wholesale rate by the number of units in a box', () => {
    expect(calculateInBoxPrice(12, 20)).toBe(240);
  });

  it('rounds to two decimals so currency never carries float noise', () => {
    expect(calculateInBoxPrice(12.345, 3)).toBe(37.04);
  });

  it('yields nothing when either side is missing', () => {
    expect(calculateInBoxPrice(null, 20)).toBeNull();
    expect(calculateInBoxPrice(12, null)).toBeNull();
    expect(calculateInBoxPrice(undefined, undefined)).toBeNull();
  });

  it('yields nothing for a box that holds nothing', () => {
    expect(calculateInBoxPrice(12, 0)).toBeNull();
    expect(calculateInBoxPrice(12, -5)).toBeNull();
  });

  it('allows a free product to price a box at zero', () => {
    expect(calculateInBoxPrice(0, 20)).toBe(0);
  });
});

describe('InBoxPriceLink', () => {
  let form: FormGroup<{
    wholesale: FormControl<number | null>;
    quantityInBox: FormControl<number | null>;
    inBoxPrice: FormControl<number | null>;
  }>;
  let link: InBoxPriceLink;

  const connect = (): void => {
    link = new InBoxPriceLink(form.controls);
    TestBed.runInInjectionContext(() => link.connect());
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});

    form = new FormGroup({
      wholesale: new FormControl<number | null>(0),
      quantityInBox: new FormControl<number | null>(1),
      inBoxPrice: new FormControl<number | null>(0),
    });
  });

  it('fills in the price when the quantity per box is entered', () => {
    form.controls.wholesale.setValue(12);
    connect();

    form.controls.quantityInBox.setValue(20);

    expect(form.controls.inBoxPrice.value).toBe(240);
    expect(link.overridden()).toBe(false);
  });

  it('recalculates when the wholesale price changes', () => {
    connect();
    form.controls.quantityInBox.setValue(20);
    form.controls.wholesale.setValue(12);

    expect(form.controls.inBoxPrice.value).toBe(240);

    form.controls.wholesale.setValue(15);

    expect(form.controls.inBoxPrice.value).toBe(300);
  });

  it('exposes the calculated amount even while it is in use', () => {
    connect();
    form.controls.wholesale.setValue(12);
    form.controls.quantityInBox.setValue(20);

    expect(link.calculated()).toBe(240);
  });

  // Boxes are routinely discounted below the sum of their contents, so a
  // hand-typed amount has to survive later edits to the other two fields.
  describe('once the price is typed in by hand', () => {
    beforeEach(() => {
      connect();
      form.controls.wholesale.setValue(12);
      form.controls.quantityInBox.setValue(20);
      form.controls.inBoxPrice.setValue(225);
    });

    it('marks the field as overridden', () => {
      expect(link.overridden()).toBe(true);
    });

    it('keeps the typed amount when the wholesale price changes', () => {
      form.controls.wholesale.setValue(15);

      expect(form.controls.inBoxPrice.value).toBe(225);
    });

    it('keeps the typed amount when the quantity per box changes', () => {
      form.controls.quantityInBox.setValue(24);

      expect(form.controls.inBoxPrice.value).toBe(225);
    });

    it('still reports what the formula would give', () => {
      form.controls.quantityInBox.setValue(24);

      expect(link.calculated()).toBe(288);
    });

    it('goes back to the calculated amount on reset', () => {
      link.reset();

      expect(link.overridden()).toBe(false);
      expect(form.controls.inBoxPrice.value).toBe(240);
    });
  });

  describe('resync', () => {
    it('treats a stored price that matches the formula as not overridden', () => {
      connect();
      form.patchValue({ wholesale: 12, quantityInBox: 20, inBoxPrice: 240 });
      link.resync();

      expect(link.overridden()).toBe(false);
    });

    // Opening a product to fix a typo must not silently reprice its boxes.
    it('treats a stored price that differs from the formula as overridden', () => {
      connect();
      form.patchValue({ wholesale: 12, quantityInBox: 20, inBoxPrice: 225 });
      link.resync();

      expect(link.overridden()).toBe(true);
      expect(form.controls.inBoxPrice.value).toBe(225);

      form.controls.wholesale.setValue(15);

      expect(form.controls.inBoxPrice.value).toBe(225);
    });

    it('leaves a product with no quantity per box alone', () => {
      connect();
      form.patchValue({ wholesale: 12, quantityInBox: null, inBoxPrice: 99 });
      link.resync();

      expect(link.overridden()).toBe(false);
      expect(link.calculated()).toBeNull();
      expect(form.controls.inBoxPrice.value).toBe(99);
    });
  });
});
