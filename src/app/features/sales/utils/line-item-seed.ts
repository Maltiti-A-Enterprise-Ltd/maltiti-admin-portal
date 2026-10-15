import { FormControl, Validators } from '@angular/forms';
import { SaleLineItemDto } from '../models/sale.model';

/**
 * The values and controls the line-item editor opens on for an existing line.
 *
 * Pulled out of the editor, which was at its length limit. It is also two
 * separate jobs that happened to share a method — the form's own values, and
 * a pair of control maps built from the batch allocations — so they read
 * better named than inlined.
 */

/** What `patchValue` is given for a line that already exists. */
export function lineItemFormSeed(item: SaleLineItemDto): {
  productId: string;
  requestedQuantity: number;
  customPrice: number | undefined;
  finalPrice: number | undefined;
  priceType: 'retail';
  premiumType: SaleLineItemDto['premiumType'];
  premiumValue: number | null;
} {
  return {
    productId: item.productId,
    requestedQuantity: item.requestedQuantity,
    customPrice: item.customPrice ? Number(item.customPrice) : undefined,
    finalPrice: item.finalPrice ? Number(item.finalPrice) : undefined,
    priceType: 'retail', // Default to retail
    /* Null rather than undefined so reopening a line that had a premium
       removed clears the fields instead of leaving the old figures. */
    premiumType: item.premiumType ?? null,
    premiumValue: item.premiumValue ?? null,
  };
}

/** One control per batch allocation, keyed by position. */
export function batchControlsFor(
  item: SaleLineItemDto,
): Map<number, FormControl<string | null>> {
  const controls = new Map<number, FormControl<string | null>>();

  (item.batchAllocations ?? []).forEach((allocation, index) => {
    controls.set(
      index,
      new FormControl(allocation.batchId, { validators: Validators.required }),
    );
  });

  return controls;
}

/** The matching quantity control for each allocation. */
export function allocationQuantityControlsFor(
  item: SaleLineItemDto,
): Map<number, FormControl<number | null>> {
  const controls = new Map<number, FormControl<number | null>>();

  (item.batchAllocations ?? []).forEach((allocation, index) => {
    controls.set(
      index,
      new FormControl(allocation.quantity, { validators: Validators.required }),
    );
  });

  return controls;
}
