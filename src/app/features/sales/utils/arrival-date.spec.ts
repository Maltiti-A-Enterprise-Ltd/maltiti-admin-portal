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

  /*
   * The day a shipment was promised for is the day to go and check it, so
   * it earns the warning styling — but it is not late yet, and an admin
   * reading "1 day late" chases an agent for no reason.
   */
  it('reads as due today on the day itself', () => {
    const eightAm = new Date('2026-03-20T08:00:00Z');

    expect(arrivalStatus(new Date('2026-03-20T00:00:00Z'), eightAm)).toEqual({
      text: 'Due today',
      isLate: true,
      daysLate: 0,
    });
  });

  it('counts whole calendar days once the date has passed', () => {
    const eightAm = new Date('2026-03-20T08:00:00Z');

    expect(arrivalStatus(new Date('2026-03-18T00:00:00Z'), eightAm)?.text).toBe(
      '2 days late',
    );
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

  /* The API sends ISO strings, not Date objects. Counted in whole
     calendar days: the 17th to the 20th is three. */
  it('accepts an ISO string as well as a Date', () => {
    expect(arrivalStatus('2026-03-17T00:00:00.000Z', NOW)?.text).toBe('3 days late');
  });

  /* The same day, however the clock reads: the date has arrived, so the
     shipment is worth checking on, but it is not late. */
  it('treats the moment itself as due today', () => {
    expect(arrivalStatus(NOW, NOW)).toEqual({
      text: 'Due today',
      isLate: true,
      daysLate: 0,
    });
  });
});

describe('formatDay', () => {
  /* "03/11/2026" is a different day either side of the Atlantic; a named
     month cannot be misread. */
  it('names the month rather than numbering it', () => {
    expect(formatDay(new Date('2026-11-03T00:00:00Z'))).toBe('3 Nov 2026');
  });
});
