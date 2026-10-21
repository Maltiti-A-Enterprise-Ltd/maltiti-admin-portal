/**
 * How a shipment's expected arrival reads on the screen.
 *
 * The backend decides the `arrival_overdue` bucket; this only phrases it.
 * Keeping the wording here rather than in a template means the list and the
 * detail page cannot describe the same date two different ways.
 */

import { OrderStatus } from '../models/sale.model';

/** What the list shows against an in-transit sale. */
export interface ArrivalStatus {
  /** "Due 3 Nov" or "3 days late". */
  readonly text: string;
  /** Whether it has already passed — drives the warning styling. */
  readonly isLate: boolean;
  /** Whole days past the date. Zero when it has not passed. */
  readonly daysLate: number;
}

const MS_PER_DAY = 86_400_000;

/**
 * Whole calendar days between two dates, ignoring the time of day.
 *
 * Arrival dates are stored as UTC midnight, so subtracting instants made a
 * shipment due *today* read as a fraction of a day and round up to "1 day
 * late" — telling an admin to chase something that is not yet overdue.
 */
const calendarDaysBetween = (from: Date, to: Date): number => {
  const day = (date: Date): number =>
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

  return Math.round((day(to) - day(from)) / MS_PER_DAY);
};

const asDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * How a date on its own reads. Null when there is no date to read.
 *
 * Phrasing only — it says nothing about whether the sale it belongs to
 * should be showing it. That is {@link saleArrivalStatus}, and anything
 * rendering against a whole sale wants that one.
 */
export function arrivalStatus(
  estimatedArrivalDate: Date | string | null | undefined,
  now: Date = new Date(),
): ArrivalStatus | null {
  const expected = asDate(estimatedArrivalDate);

  if (!expected) {
    return null;
  }

  const daysLate = calendarDaysBetween(expected, now);

  if (daysLate < 0) {
    return { text: `Due ${formatDay(expected)}`, isLate: false, daysLate: 0 };
  }

  /* The day it was promised for is the day to go and check, so it earns
     the warning styling — but calling it late would be wrong, and an admin
     reading "1 day late" chases an agent for no reason. */
  if (daysLate === 0) {
    return { text: 'Due today', isLate: true, daysLate: 0 };
  }

  return {
    text: `${daysLate} day${daysLate === 1 ? '' : 's'} late`,
    isLate: true,
    daysLate,
  };
}

/** The shape of a sale this needs, so a test need not build a whole one. */
export interface ArrivalSale {
  readonly estimatedArrivalDate?: Date | string | null;
  readonly orderStatus: OrderStatus;
}

/**
 * What a *sale* should show about its arrival, which is usually nothing.
 *
 * An arrival date survives the sale being marked delivered — it is a record
 * of what was promised, and clearing it would lose that. But the note it
 * drives is an instruction: amber, an exclamation icon, "1 day late", go and
 * chase the shipping agent. On a consignment that has already landed there is
 * nothing to chase, and the row kept saying so for ever.
 *
 * It also contradicted the server. `assessSaleAttention` only reaches
 * `arrival_overdue` while the order is in transit, so a delivered sale is
 * SETTLED and drops out of the "needs attention" count — while the row beside
 * that count still showed a warning. Gating on the same condition is what
 * makes the two agree.
 *
 * In transit and nothing else. Cancelled orders were showing it too.
 */
export function saleArrivalStatus(
  sale: ArrivalSale | null | undefined,
  now: Date = new Date(),
): ArrivalStatus | null {
  if (sale?.orderStatus !== OrderStatus.IN_TRANSIT) {
    return null;
  }

  return arrivalStatus(sale.estimatedArrivalDate, now);
}

/** "3 Nov 2026" — short enough for a table cell, unambiguous about the month. */
export function formatDay(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * The calendar day an admin picked, as the API wants it.
 *
 * UTC midnight, so a date chosen in Accra does not land on the previous
 * day for anyone reading it elsewhere — the same conversion the dispatch
 * dialog does, shared so the two cannot drift.
 *
 * Null for an empty field, which is how a date is removed rather than
 * left alone.
 */
export function arrivalDateForApi(date: Date | null | undefined): string | null {
  if (!date) {
    return null;
  }

  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  ).toISOString();
}
