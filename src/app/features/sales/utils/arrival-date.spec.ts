import { arrivalStatus, formatDay } from './arrival-date';

const NOW = new Date('2026-03-20T09:00:00Z');
const daysAgo = (days: number): Date => new Date(NOW.getTime() - days * 86_400_000);
const daysAhead = (days: number): Date => new Date(NOW.getTime() + days * 86_400_000);

describe('arrivalStatus', () => {
  it('counts the days once the date has passed', () => {
    expect(arrivalStatus(daysAgo(3), NOW)).toEqual({
      text: '3 days late',
      isLate: true,
      daysLate: 3,
    });
  });

  it('says day rather than days for a single day', () => {
    expect(arrivalStatus(daysAgo(1), NOW)?.text).toBe('1 day late');
  });

  /* Promised this morning and still missing this evening should read as
     late, not as zero days late. */
  it('counts part of a day as a full day', () => {
    const anHourAgo = new Date(NOW.getTime() - 3_600_000);

    expect(arrivalStatus(anHourAgo, NOW)).toEqual({
      text: '1 day late',
      isLate: true,
      daysLate: 1,
    });
  });

  it('shows the date itself while it is still to come', () => {
    const status = arrivalStatus(daysAhead(5), NOW);

    expect(status?.isLate).toBeFalse();
    expect(status?.daysLate).toBe(0);
    expect(status?.text).toBe('Due 25 Mar 2026');
  });

  /* Every sale that predates the column, and every shipment nobody dated.
     Rendering "Due —" on those rows would be noise on most of the table. */
  it('says nothing when there is no date', () => {
    expect(arrivalStatus(null, NOW)).toBeNull();
    expect(arrivalStatus(undefined, NOW)).toBeNull();
    expect(arrivalStatus('', NOW)).toBeNull();
  });

  it('says nothing for a date it cannot read', () => {
    expect(arrivalStatus('not a date', NOW)).toBeNull();
  });

  /* The API sends ISO strings, not Date objects. Midnight on the 17th to
     09:00 on the 20th is three and a bit days, and a bit counts as a whole
     one — the goods were due and are not here. */
  it('accepts an ISO string as well as a Date', () => {
    expect(arrivalStatus('2026-03-17T00:00:00.000Z', NOW)?.text).toBe('4 days late');
  });

  /* Exactly now is not yet late — the day is not over. */
  it('treats the moment itself as still to come', () => {
    expect(arrivalStatus(NOW, NOW)?.isLate).toBeFalse();
  });
});

describe('formatDay', () => {
  /* "03/11/2026" is a different day either side of the Atlantic; a named
     month cannot be misread. */
  it('names the month rather than numbering it', () => {
    expect(formatDay(new Date('2026-11-03T00:00:00Z'))).toBe('3 Nov 2026');
  });
});
