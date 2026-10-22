import {
  countNeedingAttention,
  expiryDisplay,
  formatDay,
  relativeDays,
} from './document-display';
import { CompanyDocument, DocumentExpiryState } from '../models/document.model';

const doc = (
  expiryState: DocumentExpiryState,
  daysUntilExpiry: number | null,
): CompanyDocument =>
  ({ expiryState, daysUntilExpiry }) as CompanyDocument;

describe('relativeDays', () => {
  it('reads forwards, backwards and not at all', () => {
    expect(relativeDays(21)).toBe('in 21 days');
    expect(relativeDays(1)).toBe('in 1 day');
    expect(relativeDays(0)).toBe('today');
    expect(relativeDays(-1)).toBe('1 day ago');
    expect(relativeDays(-14)).toBe('14 days ago');
  });
});

describe('expiryDisplay', () => {
  it('is blunt and red about something that has lapsed', () => {
    const shown = expiryDisplay(doc(DocumentExpiryState.EXPIRED, -4));

    expect(shown.text).toBe('Expired 4 days ago');
    expect(shown.severity).toBe('danger');
    expect(shown.urgent).toBeTrue();
  });

  it('warns about one running out', () => {
    const shown = expiryDisplay(doc(DocumentExpiryState.EXPIRING_SOON, 21));

    expect(shown.text).toBe('Expires in 21 days');
    expect(shown.severity).toBe('warn');
    expect(shown.urgent).toBeTrue();
  });

  it('is quiet about one that is fine', () => {
    const shown = expiryDisplay(doc(DocumentExpiryState.VALID, 200));

    expect(shown.severity).toBe('success');
    expect(shown.urgent).toBeFalse();
  });

  /* Not "valid forever" — most of the register simply does not have the
     question, and a green tick there would mean nothing. */
  it('says plainly that there is no expiry rather than implying validity', () => {
    const shown = expiryDisplay(doc(DocumentExpiryState.NO_EXPIRY, null));

    expect(shown.text).toBe('No expiry');
    expect(shown.severity).toBe('secondary');
    expect(shown.urgent).toBeFalse();
  });

  it('copes with a state that arrives without a day count', () => {
    expect(expiryDisplay(doc(DocumentExpiryState.EXPIRING_SOON, null)).text).toBe(
      'Expires soon',
    );
  });
});

describe('formatDay', () => {
  /* "03/11/2026" is a different day either side of the Atlantic; a named
     month cannot be misread. */
  it('names the month rather than numbering it', () => {
    expect(formatDay('2027-03-31')).toBe('31 Mar 2027');
  });

  it('says nothing for no date or an unreadable one', () => {
    expect(formatDay(null)).toBe('');
    expect(formatDay('not a date')).toBe('');
  });
});

describe('countNeedingAttention', () => {
  it('counts the expired and the expiring, and nothing else', () => {
    expect(
      countNeedingAttention([
        doc(DocumentExpiryState.EXPIRED, -2),
        doc(DocumentExpiryState.EXPIRING_SOON, 5),
        doc(DocumentExpiryState.VALID, 300),
        doc(DocumentExpiryState.NO_EXPIRY, null),
      ]),
    ).toBe(2);
  });

  it('is zero for a tidy register', () => {
    expect(countNeedingAttention([doc(DocumentExpiryState.NO_EXPIRY, null)])).toBe(0);
  });
});
