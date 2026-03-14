import { OrderStatus, PaymentStatus } from '@app/features/sales/models/sale.model';

export function getStatusSeverity(status: OrderStatus): 'success' | 'info' | 'warn' | 'danger' {
  switch (status) {
    case OrderStatus.DELIVERED:
      return 'success';
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
  };
  return transitions[currentStatus] || [];
}
