import {
  DimensionUnit,
  Product,
  ProductDimensions,
  QuantityUnit,
} from '../models/product.model';

/**
 * The dimensions section of the product form.
 *
 * Kept out of the dialog, which is at its length limit, and out of the
 * template, which should not be deciding what counts as a measurement worth
 * saving. Everything here is pure, so the rules below can be checked without
 * standing up a form.
 */

/** For the unit dropdown. */
export const DIMENSION_UNIT_OPTIONS: { label: string; value: DimensionUnit }[] =
  [
    { label: 'Centimetres (cm)', value: DimensionUnit.CENTIMETRE },
    { label: 'Inches (in)', value: DimensionUnit.INCH },
  ];

/** What the form holds while it is being filled in. */
export interface DimensionsFormValue {
  length?: number | null;
  breadth?: number | null;
  height?: number | null;
  unit?: DimensionUnit | null;
}

/**
 * Which products are offered the section.
 *
 * Boxes and cartons today. The list is here rather than hardcoded in the
 * template because the request was explicitly that other containers follow —
 * adding a drum is one entry, not a template edit and a new condition.
 *
 * Deliberately not every unit: a product sold loose by the kilo has no
 * container to measure, and a set of empty boxes on every product form is
 * how a field gets ignored.
 */
export const UNITS_WITH_DIMENSIONS: readonly QuantityUnit[] = [
  QuantityUnit.BOX,
  QuantityUnit.CARTON,
  QuantityUnit.PALLET,
  QuantityUnit.DRUM,
  QuantityUnit.BUCKET,
  QuantityUnit.JERRY_CAN,
];

export function hasDimensions(unit: QuantityUnit | null | undefined): boolean {
  return !!unit && UNITS_WITH_DIMENSIONS.includes(unit);
}

const measurement = (value: number | null | undefined): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;

/**
 * The form's dimensions as the API wants them, or `null` to clear.
 *
 * Null rather than omitted when nothing was entered: emptying the fields has
 * to actually remove the stored dimensions, and an omitted key means
 * "unchanged" to the API. A set with no measurements at all is not worth
 * storing — a bare unit says nothing.
 */
export function dimensionsPayload(
  value: DimensionsFormValue | null | undefined,
): ProductDimensions | null {
  const length = measurement(value?.length);
  const breadth = measurement(value?.breadth);
  const height = measurement(value?.height);

  if (!length && !breadth && !height) {
    return null;
  }

  return {
    ...(length ? { length } : {}),
    ...(breadth ? { breadth } : {}),
    ...(height ? { height } : {}),
    unit: value?.unit ?? DimensionUnit.CENTIMETRE,
  };
}

/** What to put in the form when a product is loaded for editing. */
export function dimensionsSeed(
  product: Pick<Product, 'dimensions'> | null | undefined,
): Required<DimensionsFormValue> {
  const stored = product?.dimensions;

  return {
    length: stored?.length ?? null,
    breadth: stored?.breadth ?? null,
    height: stored?.height ?? null,
    unit: stored?.unit ?? DimensionUnit.CENTIMETRE,
  };
}

/**
 * `"40 × 30 × 25 cm"` for display, or null when there is nothing to show.
 *
 * Only the measurements that exist are printed — "40 × — × 25" reads as a
 * missing value where "40 × 25 cm" reads as two of them, which is what it is.
 */
export function formatDimensions(
  dimensions: ProductDimensions | null | undefined,
): string | null {
  if (!dimensions) {
    return null;
  }

  const parts = [dimensions.length, dimensions.breadth, dimensions.height]
    .filter((part): part is number => typeof part === 'number' && part > 0)
    .map((part) => `${part}`);

  return parts.length ? `${parts.join(' × ')} ${dimensions.unit}` : null;
}
