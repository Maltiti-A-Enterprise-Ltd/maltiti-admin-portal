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
