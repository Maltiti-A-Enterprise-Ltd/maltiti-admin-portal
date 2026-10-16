/**
 * The currencies a sale can involve, and the rate that joins them to cedis.
 *
 * Split out of `sale.model.ts`, which was over its length limit. The same
 * three values serve two different jobs: the currency a sale was **agreed**
 * in, which denominates its amounts, and the currency an invoice is
 * **printed** in, which only changes how a cedi sale is presented.
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
  /**
   * Also print weights in pounds, for a client who reads in them —
   * "55.12 lb / 25 kg". Both units, never one: the stored weight and the
   * price stay metric. Volume is left in litres, because "gallons" is
   * ambiguous between imperial and US.
   */
  showImperialWeights?: boolean;
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
