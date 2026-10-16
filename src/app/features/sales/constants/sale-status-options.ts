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
/*
 * "Part payment" is also derived server-side, from the confirmed payments
 * against the total — but it is offered here too.
 *
 * It was withheld at first on the grounds that a hand-set value could be
 * overwritten by the next payment edit. In practice that is backwards: a
 * deposit paid in cash, or taken before the sale was recorded, has no
 * payment record to derive anything from, and leaving the sale reading
 * "pending payment" is the very thing this status was asked for. The
 * derivation only runs when a payment is added or edited, and when it does
 * run it arrives at the same answer, so setting it by hand costs nothing
 * and covers the case the derivation cannot see.
 */
export const PAYMENT_STATUS_OPTIONS = [
  { label: 'Invoice Requested', value: PaymentStatus.INVOICE_REQUESTED },
  { label: 'Awaiting Delivery', value: PaymentStatus.AWAITING_DELIVERY },
  { label: 'Pending Payment', value: PaymentStatus.PENDING_PAYMENT },
  { label: 'Part Payment', value: PaymentStatus.PART_PAYMENT },
  { label: 'Paid', value: PaymentStatus.PAID },
  { label: 'Refunded', value: PaymentStatus.REFUNDED },
];

/*
 * The same list with an "all" entry, for the filters above the sales list.
 * Kept beside the original so a new status is added in one place rather than
 * two — the list and the form drifted apart before this existed.
 */
export const ORDER_STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: null },
  ...ORDER_STATUS_OPTIONS,
];

export const PAYMENT_STATUS_FILTER_OPTIONS = [
  { label: 'All Payment Statuses', value: null },
  ...PAYMENT_STATUS_OPTIONS,
];
