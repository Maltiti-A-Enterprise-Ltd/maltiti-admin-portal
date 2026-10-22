/**
 * The document dialog's form, as the API wants it.
 *
 * Pulled out of the dialog so the conversions can be checked without standing
 * a component up — and there are three here that are each easy to get wrong
 * in a way nothing would notice until a reminder failed to fire.
 */

import {
  CreateDocumentDto,
  DocumentCategory,
  DocumentSource,
  UpdateDocumentDto,
} from '../models/document.model';

/** Every control is nullable, as a plain `FormBuilder` types them. */
export interface DocumentFormValue {
  title: string | null;
  category: DocumentCategory | null;
  issuer: string | null;
  referenceNumber: string | null;
  description: string | null;
  expiresAt: Date | null;
  /**
   * The lead time as the select holds it: `''` for "don't remind me", and the
   * number of days as a string otherwise.
   *
   * A string because the shared field renderer's options are string-valued,
   * and `'0'` — tell me on the day — has to survive, which is exactly the
   * value a numeric falsy check would eat.
   */
  reminderLeadDays: string | null;
  url: string | null;
  source: DocumentSource | null;
}

/**
 * A picked date as the plain day the API stores.
 *
 * Built from the local calendar parts rather than `toISOString()`, which
 * converts to UTC first — so a date picked in Accra late in the evening would
 * be filed as the following day, and a certificate would read as expiring
 * one day after it actually does.
 */
export function asPlainDay(date: Date | null): string | null {
  if (!date) {
    return null;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/** Trimmed, with an emptied box meaning "clear it" rather than "skip it". */
const orNull = (value: string | null | undefined): string | null =>
  value?.trim() || null;

/**
 * The reminder select's value as the API wants it.
 *
 * `''` is "don't remind me" and becomes null. Everything else is a number of
 * days — including `'0'`, which means "tell me on the day" and is the one
 * value a `Number(x) || null` would quietly turn into never.
 */
export function asLeadDays(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const days = Number(value);

  return Number.isFinite(days) ? days : null;
}

/**
 * Both shapes, so the caller picks rather than this guessing.
 *
 * They share every field but the link, which only exists on `create` — the
 * dialog knows which one it needs and asking twice would be two code paths
 * that could disagree about an expiry date.
 */
export function buildDocumentPayload(value: DocumentFormValue): {
  create: CreateDocumentDto;
  update: UpdateDocumentDto;
} {
  const expiresAt = asPlainDay(value.expiresAt);

  const shared = {
    title: value.title?.trim() ?? '',
    category: value.category ?? DocumentCategory.OTHER,
    issuer: orNull(value.issuer) ?? undefined,
    referenceNumber: orNull(value.referenceNumber) ?? undefined,
    description: orNull(value.description) ?? undefined,
    expiresAt,
    /* A lead time with no date to count back from does nothing, so it is
       dropped rather than stored as a setting that silently never fires. */
    reminderLeadDays: expiresAt ? asLeadDays(value.reminderLeadDays) : null,
  };

  return {
    create: {
      ...shared,
      version: {
        url: value.url?.trim() ?? '',
        source: value.source ?? DocumentSource.MICROSOFT_365,
      },
    },
    /* The link is deliberately absent: replacing a file is its own call, so a
       renewal always leaves the copy it replaced behind. */
    update: shared,
  };
}
