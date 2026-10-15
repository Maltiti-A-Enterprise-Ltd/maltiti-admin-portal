/**
 * What an open sale is waiting on, derived server-side from its status,
 * balance and age rather than stored.
 *
 * A sale is finished when it is delivered and fully paid, or cancelled —
 * there are only those two ways to be done, so everything else is open. The
 * names describe the next action rather than the state the sale is in.
 */
export enum SaleAttention {
  PAYMENT_OVERDUE = 'payment_overdue',
  NEEDS_INVOICE = 'needs_invoice',
  READY_TO_PACK = 'ready_to_pack',
  CONFIRM_DELIVERY = 'confirm_delivery',
  ARRIVAL_OVERDUE = 'arrival_overdue',
  STALLED = 'stalled',
  PAID_NOT_DELIVERED = 'paid_not_delivered',
  AWAITING_PAYMENT = 'awaiting_payment',
  SETTLED = 'settled',
}

export const SALE_ATTENTION_LABELS: Record<SaleAttention, string> = {
  [SaleAttention.PAYMENT_OVERDUE]: 'Payment overdue',
  [SaleAttention.NEEDS_INVOICE]: 'Needs invoice',
  [SaleAttention.READY_TO_PACK]: 'Ready to pack',
  [SaleAttention.CONFIRM_DELIVERY]: 'Confirm delivery',
  [SaleAttention.ARRIVAL_OVERDUE]: 'Past arrival date',
  [SaleAttention.STALLED]: 'Stalled',
  [SaleAttention.PAID_NOT_DELIVERED]: 'Paid, not delivered',
  [SaleAttention.AWAITING_PAYMENT]: 'Awaiting payment',
  [SaleAttention.SETTLED]: 'Settled',
};

/** The day counts the buckets are decided by. Served, never restated here. */
export interface SaleAttentionThresholds {
  paymentTermsDays: number;
  inTransitDays: number;
  stalledDays: number;
}

/** Counts for the chips above the sales list. */
export interface SaleAttentionSummary {
  buckets: Partial<Record<SaleAttention, number>>;
  /** Open sales waiting on us. */
  needsAttention: number;
  /** Open sales an admin flagged by hand. */
  flagged: number;
  /** What the rules actually use, so the explanation cannot drift. */
  thresholds?: SaleAttentionThresholds;
}

/**
 * What each bucket means, for the "how this is decided" panel.
 *
 * The prose lives here because it is display copy; the numbers inside it
 * come from the API, so tuning a threshold server-side changes what admins
 * are told without anyone remembering to edit this file.
 */
export const SALE_ATTENTION_RULES: {
  bucket: SaleAttention;
  rule: (t: SaleAttentionThresholds) => string;
}[] = [
  {
    bucket: SaleAttention.PAYMENT_OVERDUE,
    rule: (t) =>
      `Still owes money more than ${t.paymentTermsDays} days after being invoiced — the same terms printed on the invoice.`,
  },
  {
    bucket: SaleAttention.NEEDS_INVOICE,
    rule: () => 'Asked for an invoice and has not been sent one.',
  },
  {
    bucket: SaleAttention.READY_TO_PACK,
    rule: () => 'Paid for, but still sitting here unpacked.',
  },
  {
    bucket: SaleAttention.CONFIRM_DELIVERY,
    rule: (t) =>
      `Dispatched more than ${t.inTransitDays} days ago and not confirmed delivered. Sea freight takes weeks, so this is the point past which someone should ask the agent.`,
  },
  {
    bucket: SaleAttention.ARRIVAL_OVERDUE,
    rule: () =>
      'In transit past the arrival date we were given. Ask the agent, then either confirm the delivery or record a new date. Unlike every other rule here, this one is decided by a date somebody set rather than by how long something has waited.',
  },
  {
    bucket: SaleAttention.STALLED,
    rule: (t) => `Open, within terms, and nothing has changed on it for ${t.stalledDays} days.`,
  },
  {
    bucket: SaleAttention.PAID_NOT_DELIVERED,
    rule: () =>
      'Money is in for goods the customer has not received. Counted rather than flagged — most are simply still in transit.',
  },
  {
    bucket: SaleAttention.AWAITING_PAYMENT,
    rule: () => 'Open and waiting on the customer, still within terms. Nothing to do yet.',
  },
  {
    bucket: SaleAttention.SETTLED,
    rule: () => 'Delivered and paid, or cancelled. Finished.',
  },
];

/** Body for PATCH /sales/:id/flag. Explicit rather than a toggle. */
export interface FlagSaleRequest {
  flagged: boolean;
  reason?: string;
}
