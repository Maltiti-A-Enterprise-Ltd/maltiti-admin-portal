/**
 * How a document's expiry reads on screen.
 *
 * The *state* is decided by the API — one definition of "expired", shared by
 * the register, the morning email and anything added later. This only phrases
 * it, so the list and the dialog cannot describe the same date two different
 * ways.
 */

import {
  CompanyDocument,
  DocumentExpiryState,
} from '../models/document.model';

export interface ExpiryDisplay {
  /** "Expires in 21 days", "Expired 4 days ago", "No expiry". */
  readonly text: string;
  readonly severity: 'success' | 'warn' | 'danger' | 'secondary';
  /** Whether it deserves an icon and the eye it draws. */
  readonly urgent: boolean;
}

/** "in 21 days", "today", "4 days ago". */
export function relativeDays(days: number): string {
  if (days === 0) {
    return 'today';
  }

  const count = Math.abs(days);
  const unit = count === 1 ? 'day' : 'days';

  return days > 0 ? `in ${count} ${unit}` : `${count} ${unit} ago`;
}

export function expiryDisplay(document: CompanyDocument): ExpiryDisplay {
  const days = document.daysUntilExpiry;

  switch (document.expiryState) {
    case DocumentExpiryState.EXPIRED:
      return {
        text: `Expired ${days === null ? '' : relativeDays(days)}`.trim(),
        severity: 'danger',
        urgent: true,
      };

    case DocumentExpiryState.EXPIRING_SOON:
      return {
        text: `Expires ${days === null ? 'soon' : relativeDays(days)}`,
        severity: 'warn',
        urgent: true,
      };

    case DocumentExpiryState.VALID:
      return {
        text: `Valid ${days === null ? '' : `for ${relativeDays(days).replace('in ', '')}`}`.trim(),
        severity: 'success',
        urgent: false,
      };

    /* Not "valid forever" — most of the register is policies and blank forms
       that simply do not have the question. */
    case DocumentExpiryState.NO_EXPIRY:
      return { text: 'No expiry', severity: 'secondary', urgent: false };
  }
}

/** `2027-03-31` as `31 Mar 2027`. Empty when there is no date. */
export function formatDay(day: string | null): string {
  if (!day) {
    return '';
  }

  const date = new Date(day);

  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

/** How many documents are asking to be dealt with, for the header chip. */
export function countNeedingAttention(documents: readonly CompanyDocument[]): number {
  return documents.filter((document) =>
    [DocumentExpiryState.EXPIRED, DocumentExpiryState.EXPIRING_SOON].includes(
      document.expiryState,
    ),
  ).length;
}
