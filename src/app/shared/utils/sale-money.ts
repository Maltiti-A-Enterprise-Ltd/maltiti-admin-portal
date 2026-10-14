import { InvoiceCurrency } from '@features/sales/models/sale.model';

/**
 * Showing a sale's money in the currency it was actually agreed in.
 *
 * Most sales are in cedis and nothing here changes what they look like. But
 * an export is negotiated in the buyer's money, and its amounts are stored in
 * that money — so a screen that hardcodes "GH₵" against them does not get the
 * figure wrong, it gets the *label* wrong, which is worse. Five thousand of
 * the wrong currency reads as perfectly plausible.
 *
 * Mirrors `sale-currency.util.ts` in the API, which does the same job for
 * invoices, receipts and reports.
 */

/** What the business banks and reports in. */
export const BASE_CURRENCY = InvoiceCurrency.GHS;

/** Enough of a sale to know what its money is. */
export interface SaleCurrencySource {
  currency?: InvoiceCurrency | string | null;
}

/**
 * The symbol to put in front of an amount.
 *
 * Cedis keep the ₵ sign they have always had. The others use their code: a
 * bare "$" would not say whether it is US or Canadian, and that is exactly
 * the distinction this exists to preserve.
 */
const SYMBOLS: Record<InvoiceCurrency, string> = {
  [InvoiceCurrency.GHS]: 'GH₵',
  [InvoiceCurrency.USD]: 'USD',
  [InvoiceCurrency.CAD]: 'CAD',
};

/** The currency a sale's amounts are in. Cedis for anything unset. */
export function saleCurrency(sale: SaleCurrencySource | null | undefined): InvoiceCurrency {
  const currency = sale?.currency as InvoiceCurrency | undefined;

  return currency && currency in SYMBOLS ? currency : BASE_CURRENCY;
}

/** Whether this sale is in the base currency, i.e. needs no special handling. */
export function isBaseCurrency(sale: SaleCurrencySource | null | undefined): boolean {
  return saleCurrency(sale) === BASE_CURRENCY;
}

/** `"GH₵"` or `"CAD"` — what to print before the number. */
export function currencySymbol(sale: SaleCurrencySource | null | undefined): string {
  return SYMBOLS[saleCurrency(sale)];
}

/**
 * An amount with the sale's currency in front of it, e.g. `"CAD 5,000.00"`.
 *
 * Always two decimals: a price that renders as "5,000" beside one that
 * renders as "4,999.50" makes a column impossible to scan.
 */
export function formatSaleAmount(
  amount: number | string | null | undefined,
  sale: SaleCurrencySource | null | undefined,
): string {
  const value = Number(amount);
  const shown = Number.isFinite(value) ? value : 0;

  return `${currencySymbol(sale)} ${shown.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * What a foreign sale comes to in cedis, for showing beside the real figure.
 *
 * Returns null for a cedi sale, where restating it would be noise. The rate
 * is the one pinned when the deal was agreed, so this never moves.
 */
export function ghsEquivalent(
  amountGhs: number | null | undefined,
  sale: SaleCurrencySource | null | undefined,
): string | null {
  if (isBaseCurrency(sale) || amountGhs === null || amountGhs === undefined) {
    return null;
  }

  const value = Number(amountGhs);

  if (!Number.isFinite(value)) {
    return null;
  }

  return `≈ GH₵ ${value.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
