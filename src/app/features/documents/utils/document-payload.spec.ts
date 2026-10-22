import {
  asLeadDays,
  asPlainDay,
  buildDocumentPayload,
  DocumentFormValue,
} from './document-payload';
import { DocumentCategory, DocumentSource } from '../models/document.model';

/**
 * Three conversions here are each easy to get wrong in a way nothing notices
 * until a reminder fails to fire, or a certificate reads as expiring a day
 * after it actually does.
 */
describe('asPlainDay', () => {
  /* Built from the local calendar parts, not `toISOString()`, which converts
     to UTC first — so a date picked in Accra late in the evening would be
     filed as the following day. */
  it('keeps the day that was picked, whatever the time of day', () => {
    expect(asPlainDay(new Date(2027, 2, 31, 23, 45))).toBe('2027-03-31');
    expect(asPlainDay(new Date(2027, 2, 31, 0, 15))).toBe('2027-03-31');
  });

  it('pads a single-digit month and day', () => {
    expect(asPlainDay(new Date(2027, 0, 5))).toBe('2027-01-05');
  });

  it('says nothing for no date', () => {
    expect(asPlainDay(null)).toBeNull();
  });
});

describe('asLeadDays', () => {
  /* Zero means "tell me on the day", not "never" — and it is exactly the
     value a `Number(x) || null` would quietly turn into never. */
  it('keeps a lead time of zero', () => {
    expect(asLeadDays('0')).toBe(0);
  });

  it('reads the ordinary choices', () => {
    expect(asLeadDays('30')).toBe(30);
    expect(asLeadDays('90')).toBe(90);
  });

  it('treats the empty choice as no reminder', () => {
    expect(asLeadDays('')).toBeNull();
    expect(asLeadDays(null)).toBeNull();
    expect(asLeadDays(undefined)).toBeNull();
  });

  it('refuses something that is not a number', () => {
    expect(asLeadDays('soon')).toBeNull();
  });
});

describe('buildDocumentPayload', () => {
  const form = (over: Partial<DocumentFormValue> = {}): DocumentFormValue => ({
    title: '  Organic Certificate  ',
    category: DocumentCategory.CERTIFICATION,
    issuer: 'Ghana Standards Authority',
    referenceNumber: '  GSA/ORG/2026/0184 ',
    description: '',
    expiresAt: new Date(2027, 2, 31),
    reminderLeadDays: '30',
    url: '  https://sharepoint.example/cert.pdf ',
    source: DocumentSource.MICROSOFT_365,
    ...over,
  });

  it('trims what was typed', () => {
    const { create } = buildDocumentPayload(form());

    expect(create.title).toBe('Organic Certificate');
    expect(create.referenceNumber).toBe('GSA/ORG/2026/0184');
    expect(create.version.url).toBe('https://sharepoint.example/cert.pdf');
  });

  it('sends the expiry as a plain day', () => {
    expect(buildDocumentPayload(form()).create.expiresAt).toBe('2027-03-31');
  });

  /* A lead time with no date to count back from is a setting that silently
     never fires, so it is dropped rather than stored. */
  it('drops the reminder when there is no expiry', () => {
    const { create } = buildDocumentPayload(
      form({ expiresAt: null, reminderLeadDays: '30' }),
    );

    expect(create.expiresAt).toBeNull();
    expect(create.reminderLeadDays).toBeNull();
  });

  it('keeps a same-day reminder', () => {
    expect(buildDocumentPayload(form({ reminderLeadDays: '0' })).create.reminderLeadDays).toBe(0);
  });

  it('leaves an empty optional out rather than sending a blank', () => {
    const { create } = buildDocumentPayload(form({ issuer: '   ', description: '' }));

    expect(create.issuer).toBeUndefined();
    expect(create.description).toBeUndefined();
  });

  /* Replacing a file is its own call, so the update body must not carry a
     link — otherwise a correction could overwrite a version silently. */
  it('never puts the link in the update body', () => {
    const { update } = buildDocumentPayload(form());

    expect('version' in update).toBe(false);
    expect('url' in update).toBe(false);
  });

  it('builds both shapes from the same values', () => {
    const { create, update } = buildDocumentPayload(form());

    expect(update.title).toBe(create.title);
    expect(update.expiresAt).toBe(create.expiresAt);
    expect(update.reminderLeadDays).toBe(create.reminderLeadDays);
  });
});
