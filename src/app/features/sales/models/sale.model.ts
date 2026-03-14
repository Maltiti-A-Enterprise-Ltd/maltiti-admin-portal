import { User } from '@models/user.model';
import { Product } from '../../products/models/product.model';

export enum PaymentStatus {
  INVOICE_REQUESTED = 'invoice_requested',
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  REFUNDED = 'refunded',
  AWAITING_DELIVERY = 'awaiting_delivery',
}

export enum OrderStatus {
  PENDING = 'pending',
  PACKAGING = 'packaging',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

// ─── Payment Record Enums ──────────────────────────────────────────────────────

export enum PaymentMethod {
  PAYSTACK = 'paystack',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  MOBILE_MONEY = 'mobile_money',
  CHEQUE = 'cheque',
  OTHER = 'other',
}

export enum PaymentRecordStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// ─── Payment Record Types ──────────────────────────────────────────────────────

/** A single payment instalment record for a sale */
export interface SalePaymentRecord {
  id: string;
  saleId: string;
  /** Amount in GHS */
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentRecordStatus;
  reference?: string;
  note?: string;
  /** true = recorded by customer (e.g. Paystack), false = recorded by admin */
  isCustomerInitiated: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Summary returned by GET /sales/:saleId/payments */
export interface SalePaymentSummary {
  saleId: string;
  /** Grand total for the sale in GHS */
  saleTotal: number;
  /** Sum of all CONFIRMED payment amounts */
  totalPaid: number;
  /** saleTotal - totalPaid (min 0) */
  balanceRemaining: number;
  isFullyPaid: boolean;
  payments: SalePaymentRecord[];
}

// ─── Request Bodies ────────────────────────────────────────────────────────────

/** Body for POST /sales/:saleId/payments */
export interface RecordPaymentRequest {
  /** Must be > 0 */
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentRecordStatus;
  reference?: string;
  note?: string;
  /** When true, records as customer-initiated; defaults to false (admin) */
  isCustomerInitiated?: boolean;
}

/** Body for PATCH /sales/:saleId/payments/:paymentId/status */
export interface UpdatePaymentStatusRequest {
  status: PaymentRecordStatus;
  note?: string;
}

// ─── Display Helpers ───────────────────────────────────────────────────────────

/** Human-readable labels for each PaymentMethod value */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.PAYSTACK]: 'Paystack',
  [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.MOBILE_MONEY]: 'Mobile Money',
  [PaymentMethod.CHEQUE]: 'Cheque',
  [PaymentMethod.OTHER]: 'Other',
};

/** Status chip colour config for PaymentRecordStatus */
export const PAYMENT_RECORD_STATUS_CONFIG: Record<
  PaymentRecordStatus,
  { label: string; colour: 'green' | 'yellow' | 'red' | 'purple' }
> = {
  [PaymentRecordStatus.CONFIRMED]: { label: 'Confirmed', colour: 'green' },
  [PaymentRecordStatus.PENDING]: { label: 'Pending', colour: 'yellow' },
  [PaymentRecordStatus.FAILED]: { label: 'Failed', colour: 'red' },
  [PaymentRecordStatus.REFUNDED]: { label: 'Refunded', colour: 'purple' },
};

/** Status chip colour config for PaymentStatus (sale-level) */
export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; colour: 'gray' | 'yellow' | 'blue' | 'green' | 'purple' }
> = {
  [PaymentStatus.INVOICE_REQUESTED]: { label: 'Invoice Requested', colour: 'gray' },
  [PaymentStatus.PENDING_PAYMENT]: { label: 'Pending Payment', colour: 'yellow' },
  [PaymentStatus.AWAITING_DELIVERY]: { label: 'Awaiting Delivery', colour: 'blue' },
  [PaymentStatus.PAID]: { label: 'Paid', colour: 'green' },
  [PaymentStatus.REFUNDED]: { label: 'Refunded', colour: 'purple' },
};

export interface BatchAllocationDto {
  batchId: string;
  quantity: number;
}

export interface SaleLineItemDto {
  productId: string;
  batchAllocations: BatchAllocationDto[];
  requestedQuantity: number;
  finalPrice?: number;
  customPrice?: number;
}

export interface CreateSaleDto {
  customerId: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  lineItems: SaleLineItemDto[];
  deliveryFee?: number;
}

export interface UpdateSaleLineItemDto {
  productId?: string;
  batchAllocations?: BatchAllocationDto[];
  requestedQuantity?: number;
  customPrice?: number;
}

export interface UpdateSaleDto {
  customerId?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  lineItems?: UpdateSaleLineItemDto[];
  deliveryFee?: number;
}

export interface UpdateSaleStatusDto {
  orderStatus: OrderStatus;
}

export interface AssignBatchesDto {
  productId: string;
  batchAllocations: BatchAllocationDto[];
}

export interface GenerateInvoiceDto {
  discount?: number;
  transportation?: number;
}

export interface GenerateReceiptDto {
  paymentMethod?: string;
  discount?: number;
  transportation?: number;
}

export interface DriverDetailsDto {
  name: string;
  vehicleNumber: string;
  phoneNumber: string;
  email?: string;
}

export interface ReceiverDetailsDto {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface GenerateWaybillDto {
  driver: DriverDetailsDto;
  receiver?: ReceiverDetailsDto;
  remarks?: string;
}

export interface SaleLineItem {
  id: string;
  productId: string;
  product?: Product;
  batchAllocations: BatchAllocationDto[];
  requestedQuantity: number;
  customPrice?: number;
  finalPrice?: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  customerId: string;
  confirmedDeliveryDate?: string;
  customer?: User;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  lineItems: SaleLineItem[];
  total: number;
  amount: number;
  deliveryFee: number;
  /** Populated on GET /sales/:id */
  payments?: SalePaymentRecord[];
  /** Sum of all CONFIRMED payment amounts */
  totalPaid?: number;
  /** total - totalPaid (min 0) */
  balanceRemaining?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDeliveryCostDto {
  deliveryCost: number;
}

export interface CancelSaleByAdminDto {
  waivePenalty: boolean;
  reason?: string;
}

export type PriceType = 'wholesale' | 'retail';
