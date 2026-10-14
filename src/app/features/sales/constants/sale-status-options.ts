import { OrderStatus, PaymentStatus } from '../models/sale.model';

export const ORDER_STATUS_OPTIONS = [
  { label: 'Pending', value: OrderStatus.PENDING },
  { label: 'Packaging', value: OrderStatus.PACKAGING },
  { label: 'In Transit', value: OrderStatus.IN_TRANSIT },
  { label: 'Delivered', value: OrderStatus.DELIVERED },
  { label: 'Cancelled', value: OrderStatus.CANCELLED },
];

export const PAYMENT_STATUS_OPTIONS = [
  { label: 'Invoice Requested', value: PaymentStatus.INVOICE_REQUESTED },
  { label: 'Pending Payment', value: PaymentStatus.PENDING_PAYMENT },
  { label: 'Paid', value: PaymentStatus.PAID },
  { label: 'Refunded', value: PaymentStatus.REFUNDED },
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
  { label: 'Awaiting Delivery', value: PaymentStatus.AWAITING_DELIVERY },
];
