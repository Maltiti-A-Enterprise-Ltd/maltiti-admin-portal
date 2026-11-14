/**
 * A statement of account.
 *
 * What a customer was charged, what they paid and what is left, in the
 * order it happened. The API owns the arithmetic — the running balance, the
 * opening balance, which money counts — so that a figure read on screen and
 * a figure printed on the PDF cannot disagree.
 */

export enum StatementEntryType {
  CHARGE = 'charge',
  PAYMENT = 'payment',
}

export interface StatementRow {
  /** A plain day, e.g. `2026-07-08`. */
  date: string;
  type: StatementEntryType;
  /** An invoice number, or the reference the money arrived with. */
  reference: string;
  detail: string;
  /** Added to the account. Zero on a payment row. */
  charge: number;
  /** Taken off it. Zero on a charge row. */
  paid: number;
  /** What was owed after this line. */
  balance: number;
  saleId: string;
  customerId: string;
  customerName: string;
}

export interface Statement {
  /** What was owed when the period opened, carried in from before it. */
  openingBalance: number;
  rows: StatementRow[];
  totals: {
    charged: number;
    paid: number;
    closingBalance: number;
  };
  /** Null on a ledger covering every account. */
  customerId: string | null;
  /** Narrowed to the customers who owe; never set for one customer. */
  owingOnly: boolean;
  customerName: string;
  from: string | null;
  to: string | null;
  customerCount: number;
}

export interface StatementQuery {
  customerId?: string;
  from?: string;
  to?: string;
  /** Only customers who owe at the end of the period. */
  owingOnly?: boolean;
}
