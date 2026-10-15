import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl } from '@angular/forms';
import { combineLatest, map, startWith } from 'rxjs';
import { SaleLineItemDto } from '../models/sale.model';
import {
  lineItemsPremiumTotal,
  lineItemsTotalPrice,
} from '@shared/utils/totalPriceCalculator';

/**
 * The running totals under the sale form.
 *
 * Lifted out of the component, which was over its length limit once the
 * premium figure arrived. The two belong together anyway — the second
 * exists only to say how much of the first is premium, and reading them
 * side by side is the only way to see that they agree.
 */
export interface SaleFormTotals {
  /** Goods, premiums and the delivery fee: what the customer will owe. */
  readonly total: Signal<number>;
  /** Just the premiums, for naming them under the total. */
  readonly premium: Signal<number>;
}

/** Must be called from an injection context — `toSignal` needs one. */
export function saleFormTotals(
  lineItems: FormArray<FormControl<SaleLineItemDto>>,
  deliveryFee: FormControl<number | null>,
): SaleFormTotals {
  const items$ = lineItems.valueChanges.pipe(startWith(lineItems.value));

  return {
    total: toSignal(
      combineLatest([
        items$,
        deliveryFee.valueChanges.pipe(startWith(deliveryFee.value)),
      ]).pipe(map(([items, fee]) => Number(fee) + lineItemsTotalPrice(items))),
      { initialValue: 0 },
    ),
    premium: toSignal(
      items$.pipe(map((items) => lineItemsPremiumTotal(items))),
      { initialValue: 0 },
    ),
  };
}
