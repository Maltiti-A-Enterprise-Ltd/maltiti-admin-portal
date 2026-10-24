/**
 * Debt a customer carried in from before this system kept their books.
 *
 * Stored as a sale — it is chased, invoiced against and paid the same way —
 * but it carries no line items, because the orders behind it are gone and
 * there is nothing to list.
 */

import { InvoiceCurrency } from './sale-currency.model';

/**
 * What a sale record actually is.
 *
 * Nearly all are orders. A few are debts a customer carried in from before
 * this system kept their books — chased and paid like any sale, but carrying
 * no line items and never counted as revenue, because that money was earned
 * before any of this existed.
 */
export enum SaleKind {
  ORDER = 'order',
  OPENING_BALANCE = 'opening_balance',
}

/**
 * Recording one.
 *
 * Its own body rather than a flag on `CreateSaleDto`: no line items, no
 * batches, no delivery fee and no status to pick, so folding it in would
 * make half that body forbidden depending on a flag.
 */
export interface CreateOpeningBalanceDto {
  customerId: string;
  amount: number;
  currency?: InvoiceCurrency;
  /** Cedis per one unit of `currency`. Required when it is not GHS. */
  exchangeRate?: number;
  /**
   * `2026-01-01` — the day the figure is stated as at.
   *
   * Payment terms run from here rather than from when it was typed in, so a
   * debt from January reads as overdue today instead of a week from now.
   */
  asOf: string;
  /**
   * Where the figure came from.
   *
   * The records behind it are lost, so this is the only account of why the
   * number is what it is.
   */
  note?: string;
}

/** Correcting one. The customer it belongs to cannot be changed. */
export interface UpdateOpeningBalanceDto {
  amount?: number;
  asOf?: string;
  /** Null clears it; omitted leaves it alone. */
  note?: string | null;
}
