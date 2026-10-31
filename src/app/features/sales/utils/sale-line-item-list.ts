/**
 * The products on a sale, as a list that can be rearranged.
 *
 * Pulled out of the form because these operations share one awkward
 * property: the validation errors are held in a map keyed by row *position*,
 * so every change to the list has to carry them along or they end up
 * describing whichever row has moved into that slot. Keeping the array and
 * that map in one place is what stops the two drifting apart.
 */

import { computed, signal, Signal } from '@angular/core';
import { FormArray, FormControl } from '@angular/forms';
import { SaleLineItemDto } from '../models/sale.model';
import { moveInControlMap, reindexControlMap } from './reindex-control-map';

export class SaleLineItemList {
  constructor(
    private readonly rows: FormArray<FormControl<SaleLineItemDto>>,
    private readonly makeControl: (
      value: SaleLineItemDto,
    ) => FormControl<SaleLineItemDto>,
  ) {}

  private readonly errors = signal<Map<number, boolean>>(new Map());

  /** Whether any row is incomplete, which is what blocks saving. */
  public readonly hasErrors: Signal<boolean> = computed(() =>
    [...this.errors().values()].some(Boolean),
  );

  /** Newest at the top: the row just added is the one being filled in. */
  public add(): void {
    this.rows.insert(
      0,
      this.makeControl({
        productId: '',
        requestedQuantity: 1,
        batchAllocations: [],
      }),
    );

    /* Everything moves down one. This was missed before: a new row went in
       at the top while the errors stayed where they were, so an incomplete
       row's error sat against its neighbour until either was touched. */
    this.errors.update(errors => {
      const shifted = new Map<number, boolean>();

      errors.forEach((hasError, index) => shifted.set(index + 1, hasError));

      return shifted;
    });
  }

  public remove(index: number): void {
    this.rows.removeAt(index);
    this.errors.update(errors => reindexControlMap(errors, index));
  }

  /**
   * Moves a product up or down the list.
   *
   * The order is the order: it is what the invoice, the receipt and the
   * waybill print in, so putting the main consignment at the top is a real
   * thing to want — and there was no way to do it short of deleting rows
   * and retyping them.
   *
   * The control is moved rather than its value copied, so the row's own
   * editor travels with it: the batch allocations it has open, the price
   * working, the half-typed quantity. The form template tracks by control
   * identity, which is what lets Angular move the component instance
   * instead of rebuilding it from the value.
   */
  public move(from: number, to: number): void {
    if (from === to || to < 0 || to >= this.rows.length) {
      return;
    }

    const control = this.rows.at(from);

    /* Silenced on the way through: between the removal and the insertion
       the array is briefly a row short, and anything listening would see a
       sale that is not the one being edited. */
    this.rows.removeAt(from, { emitEvent: false });
    this.rows.insert(to, control, { emitEvent: false });
    this.errors.update(errors => moveInControlMap(errors, from, to));

    this.rows.updateValueAndValidity();
  }

  public setError(index: number, hasError: boolean): void {
    this.errors.update(errors => new Map(errors).set(index, hasError));
  }
}
