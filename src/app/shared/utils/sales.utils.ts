import { OrderStatus, PaymentStatus } from '@app/features/sales/models/sale.model';

export function getStatusSeverity(
  status: OrderStatus,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  switch (status) {
    case OrderStatus.DELIVERED:
      return 'success';
    /* Grey, and deliberately not green. A pre-system sale is a debt carried
       in from before this system; dressing it as a completed delivery would
       claim something the lost records cannot support. */
    case OrderStatus.PRE_SYSTEM:
      return 'secondary';
    case OrderStatus.IN_TRANSIT:
    case OrderStatus.PACKAGING:
      return 'info';
    case OrderStatus.PENDING:
      return 'warn';
    default:
      return 'info';
  }
}

export function getStatusLabel(status: OrderStatus | PaymentStatus): string {
  return status.replace('_', ' ').replaceAll(/\b\w/g, (l) => l.toUpperCase());
}

export function getPaymentStatusSeverity(
  status: PaymentStatus,
): 'success' | 'info' | 'warn' | 'danger' {
  switch (status) {
    case PaymentStatus.PAID:
      return 'success';
    case PaymentStatus.PENDING_PAYMENT:
      return 'warn';
    /* Not 'warn' like pending: looking identical to it is the thing this
       status exists to stop. Money is moving, so it reads as progress. */
    case PaymentStatus.PART_PAYMENT:
      return 'info';
    case PaymentStatus.INVOICE_REQUESTED:
      return 'danger';
    case PaymentStatus.REFUNDED:
      return 'info';
    default:
      return 'info';
  }
}

export function getNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  // Define allowed transitions
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.PACKAGING],
    [OrderStatus.PACKAGING]: [OrderStatus.IN_TRANSIT],
    [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
    /* Terminal. A debt carried in from before this system has nowhere to
       progress to — the goods, whatever became of them, are long gone. */
    [OrderStatus.PRE_SYSTEM]: [],
  };
  return transitions[currentStatus] || [];
}
