import { FormControl } from '@angular/forms';
import { Batch } from '@features/batches/models/batch.model';

/**
 * Reading a line item's batch allocations back out of the maps they live in.
 *
 * Pulled out of the line-item editor, which was over its length limit. These
 * are lookups with a fallback and no state of their own, so they read better
 * here than as four more methods on an already-long component.
 */

/**
 * The control for a row, or a throwaway one.
 *
 * A template asks for a row's control during the render that *adds* that row,
 * before the map has caught up, so returning a detached control is what keeps
 * the binding from throwing on a blank line.
 */
export function controlAt<T>(
  controls: ReadonlyMap<number, FormControl<T | null>>,
  index: number,
  fallback: T,
): FormControl {
  return (
    controls.get(index) ?? new FormControl<T>(fallback, { nonNullable: true })
  );
}

/** What is left in a batch and when it expires, for the row's hint. */
export function batchInfo(
  batches: readonly Batch[],
  batchId: string,
): { availableQuantity: number; expiryDate: string | null } | null {
  const batch = batches.find((candidate) => candidate.id === batchId);

  if (!batch) {
    return null;
  }

  return {
    availableQuantity: batch.quantity,
    expiryDate: batch.expiryDate || null,
  };
}
