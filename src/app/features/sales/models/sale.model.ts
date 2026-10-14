import { Customer } from '@models/customer.model';
import { Product } from '../../products/models/product.model';

/* Re-exported so the many existing `from './sale.model'` imports keep working;
   the definitions moved out when this file hit its 400-line ceiling. */
export * from './sale-attention.model';
import { SaleAttention } from './sale-attention.model';

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
  /** Which of our accounts received this money. Null for cash, and for
      payments recorded before the link existed. */
  paymentAccountId?: string | null;
  /** Resolved server-side, so a payment still names its account after that
      account is retired and drops out of the picker. */
  paymentAccountLabel?: string | null;
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
  /** Optional: which of our accounts received the money. */
  paymentAccountId?: string | null;
  /** When true, records as customer-initiated; defaults to false (admin) */
  isCustomerInitiated?: boolean;
}

/**
 * Body for PATCH /sales/:saleId/payments/:paymentId — correcting a payment.
 *
 * Every field is optional and anything left out is left alone, so `null` is
 * the only way to clear a reference, note or account. An emptied box has to
 * be sent as null rather than omitted, or it would read as "unchanged".
 */
export interface UpdatePaymentRequest {
  amount?: number;
  paymentMethod?: PaymentMethod;
  status?: PaymentRecordStatus;
  reference?: string | null;
  note?: string | null;
  paymentAccountId?: string | null;
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
  /**
   * Email the customer their order confirmation, and the invoice or receipt
   * for this sale. Opt-in, so historical and offline sales can be recorded
   * without reaching the customer. Describes the save, not the sale — the API
   * does not store it.
   */
  notifyCustomer?: boolean;
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
  /**
   * Email the customer about this edit — the status update, and the invoice
   * or receipt where the payment status calls for one. Only has any effect
   * when a status actually changes. Opt-in, so correcting a back-dated sale
   * does not send a receipt for something settled weeks ago.
   */
  notifyCustomer?: boolean;
  /**
   * Edit a sale that is in transit or delivered, which the API otherwise
   * refuses. Super admins only — any other role sending it is rejected
   * outright rather than quietly ignored. Not needed to change the order or
   * payment status: those are always editable.
   */
  overrideStatusLock?: boolean;
}


export interface UpdateSaleStatusDto {
  orderStatus: OrderStatus;
  /** As above: the status change is silent unless this is set. */
  notifyCustomer?: boolean;
}

export interface AssignBatchesDto {
  productId: string;
  batchAllocations: BatchAllocationDto[];
}

/**
 * The currencies an invoice can be issued in. A sale is always recorded in
 * cedis; these are presentation currencies for buyers who ask to be invoiced
 * in their own money.
 */
export enum InvoiceCurrency {
  GHS = 'GHS',
  USD = 'USD',
  CAD = 'CAD',
}

export const INVOICE_CURRENCY_LABELS: Record<InvoiceCurrency, string> = {
  [InvoiceCurrency.GHS]: 'Ghana Cedi (GHS)',
  [InvoiceCurrency.USD]: 'US Dollar (USD)',
  [InvoiceCurrency.CAD]: 'Canadian Dollar (CAD)',
};

/** What the API quotes: cedis per one unit of `currency`. */
export interface ExchangeRateQuote {
  currency: InvoiceCurrency;
  rate: number;
  asOf: string;
  source: string;
}

/** Carried on both invoice requests so the two documents cannot disagree. */
export interface InvoiceCurrencyOptions {
  currency?: InvoiceCurrency;
  /** Cedis per one unit of `currency`. Required unless the currency is GHS. */
  exchangeRate?: number;
  /**
   * List the confirmed payments for this sale, with an amount paid and a
   * balance due. Off by default; has no effect when nothing is confirmed.
   */
  includePayments?: boolean;
}

/** Body for POST /sales/:id/invoice/email */
export interface SendInvoiceEmailDto extends InvoiceCurrencyOptions {
  /** Omit to use the address on the customer record. */
  email?: string;
  /** Carried through so the emailed PDF matches what was previewed. */
  paymentAccountIds?: string[];
}

export interface GenerateInvoiceDto extends InvoiceCurrencyOptions {
  discount?: number;
  transportation?: number;
  /**
   * Which payment accounts to print. Omit the property to use the accounts
   * marked as defaults; send an empty array to print none at all.
   */
  paymentAccountIds?: string[];
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
  /**
   * The product's name, flat on the line item, which is how the API sends it.
   * Prefer this over `product.name`: the API has never nested a whole product
   * inside a line item, so anything reading `product?.name` falls through to
   * printing a raw UUID.
   */
  productName?: string;
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
  /** The sale's customer as returned by the API (not the linked user account). */
  customer?: Customer;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  lineItems: SaleLineItem[];
  total: number;
  amount: number;
  deliveryFee: number;
  /**
   * The currency and rate this sale was last invoiced at. Absent means cedis.
   * The sale itself is always recorded in cedis; these only describe how its
   * invoice was presented, and are reused so a reissued invoice reproduces
   * the figures the customer already has.
   */
  invoiceCurrency?: InvoiceCurrency;
  invoiceExchangeRate?: number;
  /**
   * The customer's address as one line, ready to hand to a courier. Composed
   * server-side from the customer's address, city, region and country so every
   * surface shows the same string. Absent when nothing is recorded.
   */
  deliveryAddress?: string;
  /**
   * What the order weighs in kilograms, for getting a delivery quote.
   *
   * Only populated on endpoints that load the products — listing sales and
   * fetching one — so it is absent on the response to a save. Absent also when
   * not one line could be weighed; see {@link unweighedLineItems}.
   */
  totalWeightKg?: number;
  /**
   * How many line items are missing from `totalWeightKg` — their product
   * records no size, or is sold by volume and has no density to convert with.
   * Anything above zero means the weight is partial and must not be quoted to a
   * carrier as the whole shipment.
   */
  unweighedLineItems?: number;
  /** What this sale is waiting on. Derived; never sent back to the API. */
  attention?: SaleAttention;
  /** Whether it is waiting on us. False while the ball is with the customer. */
  needsAttention?: boolean;
  /** How long it has waited in its bucket, for sorting the worst first. */
  waitingDays?: number;
  /** Set when an admin flagged it by hand. Independent of needsAttention. */
  flaggedAt?: string;
  flagReason?: string;
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
