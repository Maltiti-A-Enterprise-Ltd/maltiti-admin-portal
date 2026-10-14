import { SaleAttention, SaleAttentionSummary } from '../models/sale.model';

/**
 * The chips above the sales list.
 *
 * Two independent filters, because they answer different questions. "Needs
 * attention" is derived from each sale's status, balance and age and moves as
 * the sale moves; "Flagged" is what somebody marked by hand. A sale can be in
 * both, so the chips combine rather than replacing one another.
 *
 * "Paid, not delivered" is here too even though it is not a problem — Maltiti
 * exports by sea and most of those consignments are simply still on the water,
 * but money is in for goods the customer has not got and that is worth being
 * able to pull up at any time.
 */
export type AttentionChipKey = 'needsAttention' | 'flagged' | SaleAttention.PAID_NOT_DELIVERED;

export interface AttentionChip {
  readonly key: AttentionChipKey;
  readonly label: string;
  readonly count: number;
  /** Amber for things asking for action, plain for things merely worth seeing. */
  readonly tone: 'urgent' | 'neutral';
  readonly hint: string;
}

export const EMPTY_ATTENTION_SUMMARY: SaleAttentionSummary = {
  buckets: {},
  needsAttention: 0,
  flagged: 0,
};

export function buildAttentionChips(summary: SaleAttentionSummary): AttentionChip[] {
  return [
    {
      key: 'needsAttention',
      label: 'Needs attention',
      count: summary.needsAttention,
      tone: 'urgent',
      hint: 'Open sales waiting on us — an invoice to send, an order to pack, a payment past terms.',
    },
    {
      key: 'flagged',
      label: 'Flagged',
      count: summary.flagged,
      tone: 'neutral',
      hint: 'Sales an admin marked by hand. Independent of the automatic assessment.',
    },
    {
      key: SaleAttention.PAID_NOT_DELIVERED,
      label: 'Paid, not delivered',
      count: summary.buckets[SaleAttention.PAID_NOT_DELIVERED] ?? 0,
      tone: 'neutral',
      hint: 'Money received for goods the customer has not got yet. Usually still in transit.',
    },
  ];
}

/** How long a sale has been waiting, for the row that is worst off. */
export function waitingLabel(days: number | undefined): string {
  if (!days) {
    return '';
  }

  return days === 1 ? '1 day' : `${days} days`;
}
