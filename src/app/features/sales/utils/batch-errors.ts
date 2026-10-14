import { FormControl } from '@angular/forms';

/**
 * Drops only the batch-allocation errors from a control.
 *
 * The quantity control carries its own validators as well, so the batch rules
 * cannot simply call `setErrors(null)` — that would clear "required" along
 * with them and let an empty line item through.
 */
export function clearBatchErrors(control: FormControl | null): void {
  const errors = control?.errors;

  if (!errors) {
    return;
  }

  delete errors['batchAllocationMismatch'];
  delete errors['batchOverAllocated'];

  control?.setErrors(Object.keys(errors).length ? errors : null);
}
