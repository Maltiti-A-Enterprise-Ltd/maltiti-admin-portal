export * from './sale-payment.model';
import { SalePaymentRecord } from './sale-payment.model';
export {
  InvoiceCurrency,
  INVOICE_CURRENCY_LABELS,
  type ExchangeRateQuote,
  type InvoiceCurrencyOptions,
  type SendInvoiceEmailDto,
  type GenerateInvoiceDto,
} from './sale-currency.model';
import { InvoiceCurrency } from './sale-currency.model';

import { Customer } from '@models/customer.model';
import { Product, QuantityUnit } from '../../products/models/product.model';

/* Re-exported so the many existing `from './sale.model'` imports keep working;
   the definitions moved out when this file hit its 400-line ceiling. */
export * from './sale-attention.model';
/* Split out when this file hit its 400-line ceiling, the same way the
   currency, payment and attention models were. Re-exported so the many
   existing `from './sale.model'` imports keep working. */
export * from './sale-invoice-terms.model';
/* Also split out at the 400-line ceiling. Re-exported, so the many
   existing `from './sale.model'` imports keep working. */
export * from './sale-premium.model';
import { PremiumType } from './sale-premium.model';
import { PaymentInstructionDto } from './sale-invoice-terms.model';
import { SaleAttention } from './sale-attention.model';

export enum PaymentStatus {
  INVOICE_REQUESTED = 'invoice_requested',
  PENDING_PAYMENT = 'pending_payment',
  /**
   * Some money is in, but not all of it.
   *
   * Derived server-side from the confirmed payments against the total and
   * never set by hand, which is why it is absent from the form's status
   * list and present only in the filter.
   */
  PART_PAYMENT = 'part_payment',
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
  [PaymentStatus.PART_PAYMENT]: { label: 'Part Payment', colour: 'blue' },
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
  /**
   * An optional premium charged on top of this line — a certification, a
   * grade, a specification a buyer asked for. Sent together or not at all:
   * the API rejects a type with no value, or a value with no type.
   */
  premiumType?: PremiumType | null;
  premiumValue?: number | null;
}

export interface CreateSaleDto {
  customerId: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  lineItems: SaleLineItemDto[];
  deliveryFee?: number;
  /**
   * How the invoice says this sale is to be paid, and anything else worth
   * printing on it. Stored on the sale, so a reissued or emailed invoice
   * carries the same terms. An empty array clears them.
   */
  paymentInstructions?: PaymentInstructionDto[];
  invoiceRemarks?: string | null;
  /**
   * The currency the deal was struck in, with the rate it was agreed at as
   * cedis per one unit. Omit both for an ordinary cedi sale; the API refuses
   * a foreign currency without a rate rather than guessing one.
   */
  currency?: InvoiceCurrency;
  exchangeRate?: number;
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
  /* Declared, not merely tolerated. These reached the API through a spread,
     which excess-property checking does not police — so the type said the
     premium was not sent while the code sent it. */
  premiumType?: PremiumType | null;
  premiumValue?: number | null;
}

export interface UpdateSaleDto {
  customerId?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  lineItems?: UpdateSaleLineItemDto[];
  deliveryFee?: number;
  /** See `CreateSaleDto`. An empty array clears the stored terms. */
  paymentInstructions?: PaymentInstructionDto[];
  invoiceRemarks?: string | null;
  /**
   * The currency the deal was struck in, with the rate it was agreed at as
   * cedis per one unit. Omit both for an ordinary cedi sale; the API refuses
   * a foreign currency without a rate rather than guessing one.
   */
  currency?: InvoiceCurrency;
  exchangeRate?: number;
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
  /** Optional: the arrival date can be revised without moving the status. */
  orderStatus?: OrderStatus;
  /** As above: the status change is silent unless this is set. */
  notifyCustomer?: boolean;
  /**
   * When the shipment is expected, as an ISO date. Omitted leaves whatever
   * is stored alone; `null` clears it. Those are different requests, so the
   * field must not be dropped just because it is empty.
   */
  estimatedArrivalDate?: string | null;
}

export interface AssignBatchesDto {
  productId: string;
  batchAllocations: BatchAllocationDto[];
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
  /**
   * What the quantity counts, so a line can read "1 piece" or "4 boxes"
   * rather than a bare figure. Absent on sales whose product could not be
   * loaded; callers fall back to pieces, as the API does.
   */
  quantityUnit?: QuantityUnit;
  product?: Product;
  batchAllocations: BatchAllocationDto[];
  requestedQuantity: number;
  customPrice?: number;
  finalPrice?: number;
  /** See `PremiumOnALine`. Needed on the way back as well as out. */
  premiumType?: PremiumType | null;
  premiumValue?: number | null;
  premiumAmount?: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  /**
   * The currency this sale was **negotiated** in. Every money field on it —
   * amount, fees, line prices, totalPaid, balanceRemaining — is in this.
   *
   * Not the same as `invoiceCurrency`, which only prints a cedi sale in
   * another currency and leaves the stored amounts in cedis.
   */
  currency?: InvoiceCurrency;
  /** Cedis per one unit of `currency`, pinned when the sale was agreed. */
  exchangeRate?: number;
  /** `total` in cedis at the pinned rate. For adding sales together. */
  totalGhs?: number;
  /** `balanceRemaining` in cedis at the pinned rate. */
  balanceRemainingGhs?: number;
  customerId: string;
  confirmedDeliveryDate?: string;
  /**
   * When this shipment was last said to be arriving. Absent when nobody gave
   * a date, which leaves the sale on the blunt 56-day in-transit rule. Kept
   * after delivery as a record of what was promised.
   */
  estimatedArrivalDate?: string;
  /**
   * What the premiums across this sale's lines come to, in its own currency.
   * Served rather than re-derived here, so the figure on screen is the one
   * the balance and the invoice were worked out from.
   */
  premiumTotal?: number;
  /** How this sale's invoice says it is to be paid. */
  paymentInstructions?: PaymentInstructionDto[] | null;
  /** Free text printed under the terms. */
  invoiceRemarks?: string | null;
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
