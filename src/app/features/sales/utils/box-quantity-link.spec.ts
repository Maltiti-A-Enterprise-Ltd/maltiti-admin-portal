import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { BoxedProduct, boxesForQuantity, BoxQuantityLink } from './box-quantity-link';

describe('boxesForQuantity', () => {
  it('divides the quantity by the size of a box', () => {
    expect(boxesForQuantity(40, 20)).toBe(2);
  });

  it('keeps a partial box rather than rounding it away', () => {
    expect(boxesForQuantity(50, 20)).toBe(2.5);
  });

  it('trims a recurring decimal to three places', () => {
    expect(boxesForQuantity(10, 3)).toBe(3.333);
  });

  it('yields nothing without a quantity or a box size', () => {
    expect(boxesForQuantity(null, 20)).toBeNull();
    expect(boxesForQuantity(undefined, 20)).toBeNull();
    expect(boxesForQuantity(40, 0)).toBeNull();
  });
});

describe('BoxQuantityLink', () => {
  let quantity: FormControl<number | null>;
  let product: WritableSignal<BoxedProduct | null>;
  let link: BoxQuantityLink;

  const connect = (): void => {
    link = new BoxQuantityLink(quantity, product);
    TestBed.runInInjectionContext(() => link.connect());
    TestBed.tick();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    quantity = new FormControl<number | null>(1);
    product = signal<BoxedProduct | null>({ quantityInBox: 20 });
  });

  describe('availability', () => {
    it('is offered for a product packed in boxes', () => {
      connect();

      expect(link.isBoxed()).toBe(true);
      expect(link.perBox()).toBe(20);
    });

    it('is withheld when the product records no box size', () => {
      product.set({ quantityInBox: null });
      connect();

      expect(link.isBoxed()).toBe(false);
    });

    it('is withheld when no product is selected', () => {
      product.set(null);
      connect();

      expect(link.isBoxed()).toBe(false);
    });

    // A box of one restates the quantity and tells the user nothing.
    it('is withheld when a box holds a single unit', () => {
      product.set({ quantityInBox: 1 });
      connect();

      expect(link.isBoxed()).toBe(false);
    });
  });

  describe('entering boxes', () => {
    it('fills in the quantity', () => {
      connect();

      link.boxesControl.setValue(4);

      expect(quantity.value).toBe(80);
    });

    // The sale is recorded in units, and a stock ledger cannot hold half a tub.
    it('rounds a fractional box count to whole units', () => {
      product.set({ quantityInBox: 3 });
      connect();

      link.boxesControl.setValue(2.5);

      expect(quantity.value).toBe(8);
    });
  });

  describe('entering a quantity', () => {
    it('shows what it comes to in boxes', () => {
      connect();

      quantity.setValue(60);

      expect(link.boxesControl.value).toBe(3);
    });

    it('shows a partial box', () => {
      connect();

      quantity.setValue(50);

      expect(link.boxesControl.value).toBe(2.5);
    });

    it('does not feed back and change the quantity again', () => {
      connect();

      quantity.setValue(50);

      expect(quantity.value).toBe(50);
    });
  });

  describe('switching product', () => {
    it('recounts the boxes against the new box size', () => {
      connect();
      quantity.setValue(40);
      expect(link.boxesControl.value).toBe(2);

      product.set({ quantityInBox: 10 });
      TestBed.tick();

      expect(link.boxesControl.value).toBe(4);
      expect(quantity.value).toBe(40);
    });

    it('clears the box count for a product not sold by the box', () => {
      connect();
      quantity.setValue(40);

      product.set({ quantityInBox: null });
      TestBed.tick();

      expect(link.boxesControl.value).toBeNull();
      expect(quantity.value).toBe(40);
    });
  });
});
