/**
 * The small conversions the statement page needs, kept out of the component
 * so they can be checked on their own.
 */

import { Statement } from '../models/statement.model';

/**
 * A picked date as the plain day the API filters on.
 *
 * Built from the local calendar parts rather than `toISOString()`, which
 * converts to UTC first — a date picked in Accra late in the evening would
 * otherwise be sent as the following day, and a statement to the 30th would
 * quietly include the 1st.
 */
export function asPlainDay(date: Date | null | undefined): string | null {
  if (!date) {
    return null;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * What the downloaded file is called.
 *
 * Named for the account and the period, because these get saved into
 * folders and emailed on — `statement.pdf` is lost the moment there are two
 * of them. The API names its own copy the same way; this is only what the
 * browser is told, since a blob download cannot read the header.
 */
export function statementFileName(
  statement: Statement | null,
  extension: string,
): string {
  const period = [statement?.from, statement?.to].filter(Boolean).join(' to ');
  const parts = [
    'Statement',
    statement?.customerName || 'All customers',
    period || 'all dates',
  ];

  return `${parts.join(' - ').replace(/[<>:"/\\|?*]/g, '')}.${extension}`;
}
