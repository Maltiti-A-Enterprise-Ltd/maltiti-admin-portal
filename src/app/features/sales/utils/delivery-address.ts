import { computed, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { startWith } from 'rxjs/operators';
import { customerAddressLabel, CustomerAddressSource } from '@shared/utils/customer-name';

/** A customer as the address line needs it: an id to match, and the columns. */
export type AddressableCustomer = CustomerAddressSource & { id: string };

/**
 * The selected customer's delivery address, kept in step with the dropdown.
 *
 * Follows the control rather than a loaded sale on purpose: on the sales form
 * the customer can be changed before anything is saved, and an address read
 * off the sale would still be the previous customer's.
 */
export const deliveryAddressSignal = (
  customerControl: FormControl<string | null>,
  customers: Signal<readonly AddressableCustomer[] | null | undefined>,
): Signal<string> => {
  const selectedId = toSignal(
    customerControl.valueChanges.pipe(startWith(customerControl.value)),
    { initialValue: customerControl.value },
  );

  return computed(() => {
    const id = selectedId();

    return id
      ? customerAddressLabel((customers() ?? []).find((customer) => customer.id === id))
      : '';
  });
};
