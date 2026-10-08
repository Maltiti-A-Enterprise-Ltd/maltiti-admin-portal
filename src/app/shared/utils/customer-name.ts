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

/** Up to two initials derived from whichever name identifies the customer. */
export const customerInitials = (customer?: CustomerNameSource | null): string =>
  customerDisplayName(customer, '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
