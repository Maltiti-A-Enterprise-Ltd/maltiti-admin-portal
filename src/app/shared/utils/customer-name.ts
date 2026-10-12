/**
 * Customer naming helpers.
 *
 * A customer is identified by a contact `name`, an `organizationName`, or both.
 * At least one is always present, but never assume which — always resolve the
 * label through these helpers instead of reading `customer.name` directly.
 */

export const DEFAULT_CUSTOMER_DISPLAY_NAME = 'Unnamed Customer';

/** Minimal shape needed to resolve a customer label. */
export interface CustomerNameSource {
  name?: string | null;
  organizationName?: string | null;
}

/** The single best label for a customer: contact name, else organization. */
export const customerDisplayName = (
  customer?: CustomerNameSource | null,
  fallback: string = DEFAULT_CUSTOMER_DISPLAY_NAME,
): string => customer?.name?.trim() || customer?.organizationName?.trim() || fallback;

/**
 * A single-line label carrying both names when both are known, e.g.
 * `"John Doe (Maltiti Enterprise)"`. Use where there is only one line to work
 * with, such as a dropdown option.
 */
export const customerFullLabel = (
  customer?: CustomerNameSource | null,
  fallback: string = DEFAULT_CUSTOMER_DISPLAY_NAME,
): string => {
  const personName = customer?.name?.trim();
  const organizationName = customer?.organizationName?.trim();

  return personName && organizationName
    ? `${personName} (${organizationName})`
    : customerDisplayName(customer, fallback);
};

/**
 * The secondary label to show beneath the display name — the organization when
 * a contact name is already shown, otherwise nothing.
 */
export const customerSubLabel = (customer?: CustomerNameSource | null): string => {
  const personName = customer?.name?.trim();
  const organizationName = customer?.organizationName?.trim();

  return personName && organizationName ? organizationName : '';
};

/** The address columns, as carried by a customer record. */
export interface CustomerAddressSource {
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
}

/**
 * A customer's address as one line, e.g. `"12 Gumani Road, Tamale, Ghana"`.
 *
 * The API already composes this onto a sale as `deliveryAddress`, and that is
 * what to read when a saved sale is on hand. This exists for the sales form,
 * where the customer can be changed before anything is saved and there is no
 * sale to read it from. It mirrors `buildDeliveryAddress` in the backend —
 * which is the authority; change that first and follow it here.
 *
 * A part already contained in an earlier one is skipped: customers created
 * through web checkout have their country, region and city flattened into
 * `address` itself, so appending the columns again repeats them.
 */
export const customerAddressLabel = (
  customer?: CustomerAddressSource | null,
): string => {
  const collected: string[] = [];

  for (const raw of [customer?.address, customer?.city, customer?.region, customer?.country]) {
    const part = raw?.trim();

    if (!part || collected.join(', ').toLowerCase().includes(part.toLowerCase())) {
      continue;
    }

    collected.push(part);
  }

  return collected.join(', ');
};

/** Up to two initials derived from whichever name identifies the customer. */
export const customerInitials = (customer?: CustomerNameSource | null): string =>
  customerDisplayName(customer, '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
