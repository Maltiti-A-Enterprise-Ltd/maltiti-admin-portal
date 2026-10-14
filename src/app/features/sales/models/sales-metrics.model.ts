/**
 * What the sales book is worth, for the overview panel above the list.
 *
 * Mirrors the API's `SalesMetricsDto`. Every figure is in cedis, and all of
 * them cover the whole book rather than whatever the list is filtered to.
 */

/** A sum of money and how many sales it is spread across. */
export interface MoneyGroup {
  readonly amount: number;
  readonly saleCount: number;
}

export interface Debtor {
  readonly customerId: string;
  readonly customerName: string;
  readonly amount: number;
  readonly saleCount: number;
  /** Days past terms on this customer's worst sale; 0 if none is due yet. */
  readonly daysOverdue: number;
}

export interface Receivables {
  readonly amount: number;
  readonly saleCount: number;
  /** Past the payment terms printed on the invoice. */
  readonly overdue: MoneyGroup;
  /** Dispatched, unpaid, not due yet. */
  readonly withinTerms: MoneyGroup;
}

export interface SalesMetrics {
  /** Owed to us on goods already dispatched or delivered. */
  readonly owed: Receivables;
  /** Unpaid but still on our shelf — not collectable yet. */
  readonly awaitingDispatch: MoneyGroup;
  /** Paid for and not yet delivered. The debt runs the other way. */
  readonly paidAwaitingDelivery: MoneyGroup;
  readonly topDebtors: readonly Debtor[];
  readonly otherDebtorCount: number;
  readonly thisMonth: { readonly sales: number; readonly collected: number };
  /** Last month to the same day, so the two are comparable. */
  readonly lastMonthSales: number;
}

const NO_MONEY: MoneyGroup = { amount: 0, saleCount: 0 };

/**
 * What the panel shows before the figures arrive, and if they never do.
 *
 * Zeroes rather than blanks: the panel is collapsed to a single line most of
 * the time, and a line reading "—" is indistinguishable from a line reading
 * nothing is owed. The loading and error states are shown separately.
 */
export const EMPTY_SALES_METRICS: SalesMetrics = {
  owed: { ...NO_MONEY, overdue: NO_MONEY, withinTerms: NO_MONEY },
  awaitingDispatch: NO_MONEY,
  paidAwaitingDelivery: NO_MONEY,
  topDebtors: [],
  otherDebtorCount: 0,
  thisMonth: { sales: 0, collected: 0 },
  lastMonthSales: 0,
};
