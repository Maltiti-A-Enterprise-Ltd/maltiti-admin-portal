/**
 * Payments recorded against a sale.
 *
 * Split out of `sale.model.ts`, which was over its length limit. Every
 * amount here is in the **sale's** own currency — that is what makes a
 * balance subtract cleanly and "paid in full" mean the agreed sum arrived.
 * The `received*` fields record what actually changed hands when it came in
 * something else.
 */
import { InvoiceCurrency } from './sale-currency.model';
import { PaymentMethod, PaymentRecordStatus } from './sale.model';

export interface SalePaymentRecord {
  id: string;
  saleId: string;
  /** Amount, in the sale's own currency. */
  amount: number;
  /** The currency `amount` is in — always the sale's. */
  currency?: InvoiceCurrency;
  /**
   * Cedis per one unit of `currency` at the moment the money arrived.
   * The settlement rate, not the sale's pinned one; the gap between the two
   * is the FX gain or loss.
   */
  exchangeRate?: number;
  /** What actually arrived, when it was not in the sale's own currency. */
  receivedAmount?: number;
  receivedCurrency?: InvoiceCurrency;
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
  /** Grand total for the sale, in the sale's own currency. */
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
  /**
   * Must be > 0, in the sale's own currency. Omit it when sending the
   * `received*` fields below — the API derives it from them, and supplying
   * both invites two numbers that disagree about the same payment.
   */
  amount?: number;
  /**
   * Cedis per one unit of the sale's currency at the moment the money
   * arrived. Only meaningful on a foreign sale; omitted, the API uses the
   * sale's pinned rate.
   */
  exchangeRate?: number;
  /**
   * What the customer handed over, when that was in a different currency
   * from the sale. Send these three and the API derives `amount` from them,
   * so the figure on the bank statement is what gets typed.
   */
  receivedAmount?: number;
  receivedCurrency?: InvoiceCurrency;
  /** Units of the sale's currency per one unit of `receivedCurrency`. */
  receivedRate?: number;
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
