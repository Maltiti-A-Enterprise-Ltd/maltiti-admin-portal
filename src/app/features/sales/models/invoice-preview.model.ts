import { InvoiceCurrency } from './sale-currency.model';

/**
 * What the invoice dialog needs to know about the sale it is invoicing.
 *
 * An object rather than positional arguments: four of the five are nullable
 * currencies and rates in two pairs, which are easy to transpose and
 * impossible to tell apart at the call site once transposed.
 *
 * The two pairs mean different things, and the difference is the whole point
 * of this type. `currency` is what the deal was **struck** in and is fixed.
 * `invoiceCurrency` is what it was last **presented** in, which an admin can
 * change whenever they like.
 */
export interface InvoicePreviewContext {
  readonly customerEmail?: string | null;
  /** The currency the sale was struck in, and the rate pinned with it. */
  readonly currency?: InvoiceCurrency | null;
  readonly exchangeRate?: number | null;
  /** What it was last invoiced in, where that differs. */
  readonly invoiceCurrency?: InvoiceCurrency | null;
  readonly invoiceExchangeRate?: number | null;
}
