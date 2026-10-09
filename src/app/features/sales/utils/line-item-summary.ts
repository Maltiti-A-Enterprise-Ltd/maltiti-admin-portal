import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray } from '@angular/forms';
import { map, startWith } from 'rxjs/operators';
import { SaleLineItemDto } from '../models/sale.model';

export interface LineItemSummary {
  /** Rows that actually name a product. */
  readonly productCount: number;
  /** Units across those rows, whatever each product is counted in. */
  readonly totalQuantity: number;
}

export const EMPTY_LINE_ITEM_SUMMARY: LineItemSummary = {
  productCount: 0,
  totalQuantity: 0,
};

/**
 * What a sale currently adds up to, for someone building it.
 *
 * Blank rows are not counted. Adding a product creates an empty row before
 * anything is chosen, and counting that as a product would tell the user they
 * have one more than they do.
 */
export const summariseLineItems = (
  items: readonly SaleLineItemDto[],
): LineItemSummary => {
  const chosen = items.filter((item) => !!item?.productId);

  return {
    productCount: chosen.length,
    totalQuantity: chosen.reduce(
      (total, item) => total + (Number(item.requestedQuantity) || 0),
      0,
    ),
  };
};

/** Keeps the summary in step with the line items as they are edited. */
export const lineItemSummarySignal = (
  lineItems: FormArray,
): Signal<LineItemSummary> =>
  toSignal(
    lineItems.valueChanges.pipe(
      startWith(lineItems.value),
      map((items) => summariseLineItems((items ?? []) as SaleLineItemDto[])),
    ),
    { initialValue: EMPTY_LINE_ITEM_SUMMARY },
  );
