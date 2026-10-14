import { QuantityUnit } from '@features/products/models/product.model';

/**
 * The thing a quantity counts, agreeing with it in number.
 *
 * "1 pieces" is the sort of mistake that makes a system look unfinished to the
 * person reading an order back to a customer on the phone, and there is no
 * rule that covers every case — "box" takes *es*, "jerry can" is two words.
 * So the forms are listed rather than derived.
 *
 * Mirrors `QUANTITY_UNIT_LABELS` in the backend's product-measure util, which
 * does the same job for invoices, waybills and receipts. Both have to be
 * updated when a unit is added; the alternative is the portal and the
 * paperwork disagreeing about what a product is sold in.
 */
const QUANTITY_UNIT_FORMS: Record<QuantityUnit, readonly [string, string]> = {
  [QuantityUnit.PIECE]: ['piece', 'pieces'],
  [QuantityUnit.BOX]: ['box', 'boxes'],
  [QuantityUnit.CARTON]: ['carton', 'cartons'],
  [QuantityUnit.BAG]: ['bag', 'bags'],
  [QuantityUnit.SACHET]: ['sachet', 'sachets'],
  [QuantityUnit.BOTTLE]: ['bottle', 'bottles'],
  [QuantityUnit.GALLON]: ['gallon', 'gallons'],
  [QuantityUnit.JERRY_CAN]: ['jerry can', 'jerry cans'],
  [QuantityUnit.JAR]: ['jar', 'jars'],
  [QuantityUnit.TUB]: ['tub', 'tubs'],
  [QuantityUnit.DRUM]: ['drum', 'drums'],
  [QuantityUnit.KEG]: ['keg', 'kegs'],
  [QuantityUnit.PALLET]: ['pallet', 'pallets'],
  [QuantityUnit.BUCKET]: ['bucket', 'buckets'],
};

/**
 * Products created before the field existed, and any product left unset, are
 * counted in pieces — the same fallback the API applies.
 */
export const DEFAULT_QUANTITY_UNIT = QuantityUnit.PIECE;

/**
 * Just the unit, in the right number — `"box"` for one, `"boxes"` for eleven.
 *
 * For a standalone column; use {@link formatQuantity} when the number belongs
 * beside it. Zero takes the plural, as it does in English: "0 boxes".
 */
export function quantityUnitLabel(
  quantity: number | null | undefined,
  unit?: QuantityUnit | null,
): string {
  const [singular, plural] =
    QUANTITY_UNIT_FORMS[unit ?? DEFAULT_QUANTITY_UNIT] ??
    QUANTITY_UNIT_FORMS[DEFAULT_QUANTITY_UNIT];

  return Math.abs(Number(quantity)) === 1 ? singular : plural;
}

/** A quantity with what it counts, e.g. `"11 pieces"` or `"1 box"`. */
export function formatQuantity(
  quantity: number | null | undefined,
  unit?: QuantityUnit | null,
): string {
  const count = Number(quantity ?? 0);

  return `${count.toLocaleString()} ${quantityUnitLabel(count, unit)}`;
}

/**
 * The "Sold In" dropdown, derived from the same table.
 *
 * Built rather than written out so a unit cannot be added to the enum and
 * forgotten here — which would leave it selectable nowhere, or worse,
 * selectable but unlabelled. The plural reads better as a category: the field
 * asks what a product is sold in, not what one of them is.
 */
export const QUANTITY_UNIT_OPTIONS: { label: string; value: QuantityUnit }[] = (
  Object.entries(QUANTITY_UNIT_FORMS) as [QuantityUnit, readonly [string, string]][]
).map(([value, [, plural]]) => ({
  value,
  label: plural.replace(/\b\w/g, (letter) => letter.toUpperCase()),
}));
