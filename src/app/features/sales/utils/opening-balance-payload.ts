/**
 * A picked date as the plain day the API stores.
 *
 * Built from the local calendar parts rather than `toISOString()`, which
 * converts to UTC first — so a date picked in Accra late in the evening
 * would be filed as the following day. On an opening balance that matters
 * twice over: payment terms run from this date, so a day's drift is a day's
 * difference in when the debt reads as overdue.
 *
 * Shared with the document register, which hit the same trap.
 */
export function asPlainDay(date: Date | null | undefined): string | null {
  if (!date) {
    return null;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}
