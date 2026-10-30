import { FormArray, FormControl } from '@angular/forms';
import { SaleLineItemList } from './sale-line-item-list';
import { SaleLineItemDto } from '../models/sale.model';

/**
 * Rearranging the products on a sale.
 *
 * The order is not cosmetic: it is the order the invoice, the receipt and
 * the waybill print in. What makes it fiddly is that the per-row validation
 * errors are keyed by position, so every change to the list has to carry
 * them along or an error ends up against whichever row moved into its slot
 * — and the save button is wired to those errors.
 */
describe('SaleLineItemList', () => {
  let rows: FormArray<FormControl<SaleLineItemDto>>;
  let list: SaleLineItemList;

  const line = (productId: string): SaleLineItemDto =>
    ({ productId, requestedQuantity: 1, batchAllocations: [] }) as SaleLineItemDto;

  const order = (): string[] =>
    rows.controls.map((control) => control.value.productId);

  beforeEach(() => {
    rows = new FormArray<FormControl<SaleLineItemDto>>([
      new FormControl(line('a'), { nonNullable: true }),
      new FormControl(line('b'), { nonNullable: true }),
      new FormControl(line('c'), { nonNullable: true }),
    ]);

    list = new SaleLineItemList(
      rows,
      (value) => new FormControl(value, { nonNullable: true }),
    );
  });

  describe('moving a product', () => {
    it('moves it up', () => {
      list.move(1, 0);

      expect(order()).toEqual(['b', 'a', 'c']);
    });

    it('moves it down', () => {
      list.move(0, 1);

      expect(order()).toEqual(['b', 'a', 'c']);
    });

    it('moves one from the middle to the end', () => {
      list.move(1, 2);

      expect(order()).toEqual(['a', 'c', 'b']);
    });

    /* The same control, not a copy of its value: the row's editor travels
       with it, keeping the batch allocations it has open. */
    it('keeps the control itself, not a rebuilt one', () => {
      const moved = rows.at(2);

      list.move(2, 0);

      expect(rows.at(0)).toBe(moved);
    });

    it('refuses to move the first one up', () => {
      list.move(0, -1);

      expect(order()).toEqual(['a', 'b', 'c']);
    });

    it('refuses to move the last one down', () => {
      list.move(2, 3);

      expect(order()).toEqual(['a', 'b', 'c']);
    });

    it('does nothing when a row is moved onto itself', () => {
      list.move(1, 1);

      expect(order()).toEqual(['a', 'b', 'c']);
    });
  });

  /**
   * The errors are what the save button reads, so a row that is incomplete
   * has to stay incomplete after it moves — and a complete one has to stay
   * complete. Getting this wrong blocks saving a sale that is fine, or
   * allows one that is not.
   */
  describe('the errors that travel with the rows', () => {
    it('carries an error with the row it moves', () => {
      list.setError(2, true);

      list.move(2, 0);

      expect(list.hasErrors()).toBe(true);

      /* Still against the same product, so clearing it on that row clears
         it altogether. */
      list.setError(0, false);
      expect(list.hasErrors()).toBe(false);
    });

    it('leaves the row it displaced free of it', () => {
      list.setError(0, true);

      list.move(0, 2);
      list.setError(2, false);

      expect(list.hasErrors()).toBe(false);
    });

    it('shifts the errors down when a row is dropped', () => {
      list.setError(2, true);

      list.remove(0);
      list.setError(1, false);

      expect(list.hasErrors()).toBe(false);
    });

    /* A new row goes in at the top, so everything below it moves down one.
       This was missed before: the error stayed on its old index and sat
       against its neighbour. */
    it('shifts them down when a row is added on top', () => {
      list.setError(0, true);

      list.add();
      list.setError(1, false);

      expect(list.hasErrors()).toBe(false);
    });

    it('adds the new row at the top', () => {
      list.add();

      expect(rows.length).toBe(4);
      expect(rows.at(0).value.productId).toBe('');
    });
  });
});
