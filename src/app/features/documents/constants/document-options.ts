import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_SOURCE_LABELS,
  DocumentCategory,
  DocumentSource,
} from '../models/document.model';

export const DOCUMENT_CATEGORY_OPTIONS = (
  Object.keys(DOCUMENT_CATEGORY_LABELS) as DocumentCategory[]
).map((value) => ({ label: DOCUMENT_CATEGORY_LABELS[value], value }));

export const DOCUMENT_SOURCE_OPTIONS = (
  Object.keys(DOCUMENT_SOURCE_LABELS) as DocumentSource[]
).map((value) => ({ label: DOCUMENT_SOURCE_LABELS[value], value }));

/**
 * How much notice to give before a document lapses.
 *
 * "Don't remind me" is first and is the default, because most of the register
 * is policies and blank forms nobody wants chasing. The rest are the lead
 * times that actually match how long a renewal takes — an organic
 * certification is months of work, a tax clearance is an afternoon.
 */
/**
 * String-valued because the shared field renderer's options are. `''` is
 * "don't remind me"; `asLeadDays` turns the rest back into numbers, keeping
 * `'0'` — tell me on the day — distinct from never.
 */
export const REMINDER_LEAD_OPTIONS: { label: string; value: string }[] = [
  { label: "Don't remind me", value: '' },
  { label: 'On the day it expires', value: '0' },
  { label: '1 week before', value: '7' },
  { label: '2 weeks before', value: '14' },
  { label: '1 month before', value: '30' },
  { label: '2 months before', value: '60' },
  { label: '3 months before', value: '90' },
];
