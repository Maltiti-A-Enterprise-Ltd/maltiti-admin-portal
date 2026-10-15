/**
 * How a shipment's expected arrival reads on the screen.
 *
 * The backend decides the `arrival_overdue` bucket; this only phrases it.
 * Keeping the wording here rather than in a template means the list and the
 * detail page cannot describe the same date two different ways.
 */

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

const asDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Null when there is nothing to say — no date given, or a sale that is not
 * on its way anywhere. Rendering "Due —" against a parcel still being packed
 * would be noise on every row that has no shipment at all.
 */
export function arrivalStatus(
  estimatedArrivalDate: Date | string | null | undefined,
  now: Date = new Date(),
): ArrivalStatus | null {
  const expected = asDate(estimatedArrivalDate);

  if (!expected) {
    return null;
  }

  if (expected.getTime() >= now.getTime()) {
    return {
      text: `Due ${formatDay(expected)}`,
      isLate: false,
      daysLate: 0,
    };
  }

  /* Rounded up: promised this morning and still missing this evening is one
     day late, not zero. The whole point is that it should already be here. */
  const daysLate = Math.max(1, Math.ceil((now.getTime() - expected.getTime()) / MS_PER_DAY));

  return {
    text: `${daysLate} day${daysLate === 1 ? '' : 's'} late`,
    isLate: true,
    daysLate,
  };
}

/** "3 Nov 2026" — short enough for a table cell, unambiguous about the month. */
export function formatDay(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
