import { Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormArray } from '@angular/forms';
import { combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Sale, SaleLineItemDto } from '../models/sale.model';
import { LightProduct, UnitOfMeasurement } from '@features/products/models/product.model';

/**
 * A sale's shipping weight: how it is written, and how it is worked out while
 * a sale is still being edited.
 *
 * For a saved sale the number comes from the API, which has the products. The
 * form has them too — it loads them for the product dropdown — so it can keep
 * the figure live as quantities change, the same way it already recomputes the
 * price total rather than waiting for a save.
 */

/**
 * How many kilograms one unit of each measurement is.
 *
 * Mirrors `KILOGRAMS_PER_UNIT` in the backend's `product-measure.util.ts`,
 * which is the authority — change it there first, then follow it here.
 *
 * Volume is declared at one litre to one kilogram. That is a Maltiti business
 * rule rather than a measured density: shea butter is nearer 0.91 kg/L, so the
 * 1:1 figure slightly over-states those lines, which is the safe direction for
 * a carrier declaration.
 */
const KILOGRAMS_PER_UNIT: Record<UnitOfMeasurement, number> = {
  [UnitOfMeasurement.KILOGRAM]: 1,
  [UnitOfMeasurement.GRAM]: 0.001,
  [UnitOfMeasurement.POUND]: 0.45359237,
  [UnitOfMeasurement.LITRE]: 1,
  [UnitOfMeasurement.MILLILITRE]: 0.001,
};

/** The same shape the API returns, so one set of display helpers serves both. */
export interface OrderWeight {
  totalWeightKg?: number;
  unweighedLineItems: number;
}

export const EMPTY_ORDER_WEIGHT: OrderWeight = { unweighedLineItems: 0 };

/**
 * What the line items currently on the form weigh.
 *
 * Blank rows are skipped rather than counted as unweighable — adding a product
 * creates an empty row before anything is chosen, and warning about it would
 * tell the user something is wrong with a row they have not filled in yet.
 */
export function lineItemsWeightKg(
  items: readonly SaleLineItemDto[],
  products: readonly LightProduct[],
): OrderWeight {
  const byId = new Map(products.map((product) => [product.id, product]));

  let kilograms = 0;
  let weighedLines = 0;
  let unweighedLineItems = 0;

  for (const item of items) {
    if (!item?.productId) {
      continue;
    }

    const product = byId.get(item.productId);
    const unit = product?.unitOfMeasurement;
    const perUnit = unit ? KILOGRAMS_PER_UNIT[unit] : undefined;
    const size = Number(product?.weight);

    if (perUnit === undefined || !Number.isFinite(size) || size <= 0) {
      unweighedLineItems += 1;
      continue;
    }

    kilograms += size * Math.max(Number(item.requestedQuantity) || 0, 0) * perUnit;
    weighedLines += 1;
  }

  return {
    totalWeightKg: weighedLines > 0 ? Number(kilograms.toFixed(3)) : undefined,
    unweighedLineItems,
  };
}

/**
 * A weight with everything needed to render it.
 *
 * The strings come with the number so a component does not have to hold
 * aliases to three formatters just to show one figure.
 */
export interface OrderWeightView extends OrderWeight {
  readonly label: string;
  readonly isPartial: boolean;
  readonly caveat: string;
}

const toView = (weight: OrderWeight): OrderWeightView => ({
  ...weight,
  label: orderWeightLabel(weight),
  isPartial: isWeightPartial(weight),
  caveat: weightCaveat(weight),
});

/** Keeps the weight in step with the line items as they are edited. */
export const orderWeightSignal = (
  lineItems: FormArray,
  products: Signal<readonly LightProduct[]>,
): Signal<OrderWeightView> =>
  toSignal(
    combineLatest([
      lineItems.valueChanges.pipe(startWith(lineItems.value)),
      toObservable(products),
    ]).pipe(
      map(([items, loaded]) =>
        toView(lineItemsWeightKg((items ?? []) as SaleLineItemDto[], loaded)),
      ),
    ),
    { initialValue: toView(EMPTY_ORDER_WEIGHT) },
  );

/** What a sale weighs, e.g. `"12.5 kg"`, or `"—"` when nothing could be weighed. */
export function orderWeightLabel(sale: Pick<Sale, 'totalWeightKg'>): string {
  const kilograms = sale.totalWeightKg;

  if (kilograms === null || kilograms === undefined) {
    return '—';
  }

  // Up to three decimals, trailing zeros dropped: "12.5 kg", not "12.500 kg".
  return `${kilograms.toLocaleString('en-GB', { maximumFractionDigits: 3 })} kg`;
}

/**
 * Whether the figure covers the whole order.
 *
 * A partial weight is the dangerous case: handed to a courier as if it were
 * complete, it under-quotes the shipment and the difference lands on Maltiti.
 */
export function isWeightPartial(sale: Pick<Sale, 'unweighedLineItems'>): boolean {
  return (sale.unweighedLineItems ?? 0) > 0;
}

/**
 * Why the figure is partial, in words an admin can act on.
 *
 * Every unit the catalogue uses now converts to kilograms, so there is only
 * one cause left and it is fixable: the product has no size or no unit set.
 * The message says where to fix it rather than just that something is wrong.
 */
export function weightCaveat(sale: Pick<Sale, 'unweighedLineItems'>): string {
  const count = sale.unweighedLineItems ?? 0;

  if (count === 0) {
    return '';
  }

  const items = count === 1 ? 'item is' : 'items are';

  return (
    `${count} ${items} not included — no size or unit recorded on the product. ` +
    'Set it on the product, or weigh those separately before quoting a courier.'
  );
}
