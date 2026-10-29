/**
 * What a sale is worth, whatever kind of sale it is.
 *
 * Every total on this screen is summed from the line items, which is right
 * for an order and gives nothing for a debt carried in from before this
 * system: an opening balance has no lines at all — the amount owed is the
 * whole record. So the register listed a customer who owes GHS 4,500 against
 * a total of 0.00.
 *
 * Kept apart from revenue on purpose. An opening balance is worth what is
 * owed but earns nothing, because the trade happened before any of this
 * existed; the API draws the same distinction with `saleRevenueGhs`.
 */

import { Sale, SaleLineItem } from '../models/sale.model';
import { SaleKind } from '../models/opening-balance.model';
import { lineItemsTotalPrice } from '@shared/utils/totalPriceCalculator';

export function saleValue(sale: Sale): number {
  if (sale.kind === SaleKind.OPENING_BALANCE) {
    return Number(sale.amount) || 0;
  }

  return lineItemsTotalPrice(
    (sale.lineItems ?? []) as unknown as SaleLineItem[],
  );
}
