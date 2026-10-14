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
  [SaleAttention.STALLED]: 'Stalled',
  [SaleAttention.PAID_NOT_DELIVERED]: 'Paid, not delivered',
  [SaleAttention.AWAITING_PAYMENT]: 'Awaiting payment',
  [SaleAttention.SETTLED]: 'Settled',
};

/** Counts for the chips above the sales list. */
export interface SaleAttentionSummary {
  buckets: Partial<Record<SaleAttention, number>>;
  /** Open sales waiting on us. */
  needsAttention: number;
  /** Open sales an admin flagged by hand. */
  flagged: number;
}

/** Body for PATCH /sales/:id/flag. Explicit rather than a toggle. */
export interface FlagSaleRequest {
  flagged: boolean;
  reason?: string;
}
