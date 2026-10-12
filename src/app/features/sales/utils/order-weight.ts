import { Sale } from '../models/sale.model';

/**
 * How a sale's shipping weight is written.
 *
 * The number itself is computed server-side, where the products are — a sale's
 * line items carry only a product id, so the portal has nothing to multiply.
 * These helpers decide how to say it.
 */

/** What a sale weighs, e.g. `"12.5 kg"`, or `"—"` when nothing could be weighed. */
export function orderWeightLabel(sale: Pick<Sale, 'totalWeightKg'>): string {
  const kilograms = sale.totalWeightKg;

  if (kilograms === null || kilograms === undefined) {
    return '—';
  }

  // Up to three decimals, trailing zeros dropped: "12.5 kg", not "12.500 kg".
  return `${kilograms.toLocaleString('en-GB', { maximumFractionDigits: 3 })} kg`;
}

/**
 * Whether the figure covers the whole order.
 *
 * A partial weight is the dangerous case: handed to a courier as if it were
 * complete, it under-quotes the shipment and the difference lands on Maltiti.
 */
export function isWeightPartial(sale: Pick<Sale, 'unweighedLineItems'>): boolean {
  return (sale.unweighedLineItems ?? 0) > 0;
}

/**
 * Why the figure is partial, in words an admin can act on.
 *
 * Deliberately names both causes rather than guessing between them: a product
 * with no size recorded is fixable on the product page, while one sold by the
 * litre is not — its density is not recorded anywhere, and converting on an
 * assumed one would put an invented weight on a shipping quote.
 */
export function weightCaveat(sale: Pick<Sale, 'unweighedLineItems'>): string {
  const count = sale.unweighedLineItems ?? 0;

  if (count === 0) {
    return '';
  }

  const items = count === 1 ? 'item is' : 'items are';

  return (
    `${count} ${items} not included — no size recorded, or sold by volume. ` +
    'Weigh those separately before quoting a courier.'
  );
}
