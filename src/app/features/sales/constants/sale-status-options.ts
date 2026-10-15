import { OrderStatus, PaymentStatus } from '../models/sale.model';

export const ORDER_STATUS_OPTIONS = [
  { label: 'Pending', value: OrderStatus.PENDING },
  { label: 'Packaging', value: OrderStatus.PACKAGING },
  { label: 'In Transit', value: OrderStatus.IN_TRANSIT },
  { label: 'Delivered', value: OrderStatus.DELIVERED },
  { label: 'Cancelled', value: OrderStatus.CANCELLED },
];

/* In the order a sale moves through them, which is also the order the API
   declares. "Awaiting delivery" was missing here and bolted onto the filter
   list below instead — so it could be filtered for but never actually set,
   which is the drift the note under this list warns about. */
export const PAYMENT_STATUS_OPTIONS = [
  { label: 'Invoice Requested', value: PaymentStatus.INVOICE_REQUESTED },
  { label: 'Awaiting Delivery', value: PaymentStatus.AWAITING_DELIVERY },
  { label: 'Pending Payment', value: PaymentStatus.PENDING_PAYMENT },
  { label: 'Paid', value: PaymentStatus.PAID },
  { label: 'Refunded', value: PaymentStatus.REFUNDED },
];

/**
 * Statuses the system sets for itself, which an admin must not pick.
 *
 * "Part payment" is derived server-side from the confirmed payments against
 * the total, so offering it in the form would invite someone to set a figure
 * the next payment edit silently overwrites. It still has to be filterable —
 * telling part-paid sales apart is the whole point of it.
 *
 * The note above warns about a status that could be filtered but never set.
 * This is the deliberate opposite, and it is named so the two are not
 * mistaken for each other.
 */
export const DERIVED_PAYMENT_STATUS_OPTIONS = [
  { label: 'Part Payment', value: PaymentStatus.PART_PAYMENT },
];

/*
 * The same lists with an "all" entry, for the filters above the sales list.
 * Kept beside the originals so a new status is added in one place rather than
 * two — the list and the form drifted apart before this existed.
 */
export const ORDER_STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: null },
  ...ORDER_STATUS_OPTIONS,
];

export const PAYMENT_STATUS_FILTER_OPTIONS = [
  { label: 'All Payment Statuses', value: null },
  ...PAYMENT_STATUS_OPTIONS,
  ...DERIVED_PAYMENT_STATUS_OPTIONS,
];
