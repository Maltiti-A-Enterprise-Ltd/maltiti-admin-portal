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
    inBoxPriceOverride: FormControl<boolean | null>;
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
      inBoxPriceOverride: new FormControl<boolean | null>(false),
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

  /*
   * The field is locked while the amount is derived. It used to be editable,
   * and typing in it was what counted as an override — invisible, because a
   * field that looks editable gets edited, and nothing then said the price
   * had stopped tracking the quantity somebody went on to change.
   */
  describe('while the price is derived', () => {
    beforeEach(() => {
      connect();
      form.controls.wholesale.setValue(12);
      form.controls.quantityInBox.setValue(20);
    });

    it('locks the field', () => {
      expect(form.controls.inBoxPrice.disabled).toBe(true);
    });

    /* A disabled control drops out of `form.value`, and the payload builder
       turns a missing price into an explicit null — so the saved value has
       to come from `getRawValue`, and it has to be the derived figure. */
    it('still carries the amount in the raw value', () => {
      expect(form.getRawValue().inBoxPrice).toBe(240);
      expect(form.value.inBoxPrice).toBeUndefined();
    });
  });

  describe('once the override is ticked', () => {
    beforeEach(() => {
      connect();
      form.controls.wholesale.setValue(12);
      form.controls.quantityInBox.setValue(20);
      form.controls.inBoxPriceOverride.setValue(true);
      form.controls.inBoxPrice.setValue(225);
    });

    it('reports itself as overridden', () => {
      expect(link.overridden()).toBe(true);
    });

    it('unlocks the field', () => {
      expect(form.controls.inBoxPrice.enabled).toBe(true);
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

    /* Unticking must not leave the typed figure sitting in a field that now
       claims to be calculated. */
    it('goes back to the calculated amount when unticked', () => {
      form.controls.inBoxPriceOverride.setValue(false);

      expect(link.overridden()).toBe(false);
      expect(form.getRawValue().inBoxPrice).toBe(240);
      expect(form.controls.inBoxPrice.disabled).toBe(true);
    });

    it('goes back to the calculated amount on reset', () => {
      link.reset();

      expect(link.overridden()).toBe(false);
      expect(form.getRawValue().inBoxPrice).toBe(240);
    });
  });

  describe('resync', () => {
    it('treats a stored price that matches the formula as not overridden', () => {
      connect();
      form.patchValue({ wholesale: 12, quantityInBox: 20, inBoxPrice: 240 });
      link.resync();

      expect(link.overridden()).toBe(false);
      expect(form.controls.inBoxPriceOverride.value).toBe(false);
    });

    // Opening a product to fix a typo must not silently reprice its boxes.
    it('treats a stored price that differs from the formula as overridden', () => {
      connect();
      form.patchValue({ wholesale: 12, quantityInBox: 20, inBoxPrice: 225 });
      link.resync();

      expect(link.overridden()).toBe(true);
      expect(form.getRawValue().inBoxPrice).toBe(225);

      form.controls.wholesale.setValue(15);

      expect(form.getRawValue().inBoxPrice).toBe(225);
    });

    /* The tick on screen has to agree with the state, or an admin opens a
       discounted product, sees an unticked box, and is told the price is
       calculated when it is not. */
    it('ticks the box for a stored override', () => {
      connect();
      form.patchValue({ wholesale: 12, quantityInBox: 20, inBoxPrice: 225 });
      link.resync();

      expect(form.controls.inBoxPriceOverride.value).toBe(true);
      expect(form.controls.inBoxPrice.enabled).toBe(true);
    });

    it('leaves a product with no quantity per box alone', () => {
      connect();
      form.patchValue({ wholesale: 12, quantityInBox: null, inBoxPrice: 99 });
      link.resync();

      expect(link.overridden()).toBe(false);
      expect(link.calculated()).toBeNull();
      expect(form.getRawValue().inBoxPrice).toBe(99);
    });
  });
});
