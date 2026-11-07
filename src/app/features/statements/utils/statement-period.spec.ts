import { asPlainDay, statementFileName } from './statement-period';
import { Statement } from '../models/statement.model';

/**
 * A date picked in Accra late in the evening converts to the following day
 * in UTC. Sent as the end of a period, that quietly pulls in a day that
 * belongs to the next month.
 */
describe('asPlainDay', () => {
  it('keeps the day that was picked, whatever the time of day', () => {
    expect(asPlainDay(new Date(2026, 8, 30, 23, 45))).toBe('2026-09-30');
  });

  it('pads a single-digit month and day', () => {
    expect(asPlainDay(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('says nothing for no date', () => {
    expect(asPlainDay(null)).toBeNull();
  });
});

/**
 * These get saved into folders and emailed on, so the file has to say whose
 * account it is and what it covers.
 */
describe('statementFileName', () => {
  const statement = (over: Partial<Statement> = {}): Statement =>
    ({
      customerName: 'Kofi Owusu',
      from: '2026-07-01',
      to: '2026-09-30',
      ...over,
    }) as Statement;

  it('names the account and the period', () => {
    expect(statementFileName(statement(), 'pdf')).toBe(
      'Statement - Kofi Owusu - 2026-07-01 to 2026-09-30.pdf',
    );
  });

  it('says so when it covers every date', () => {
    expect(
      statementFileName(statement({ from: null, to: null }), 'xlsx'),
    ).toBe('Statement - Kofi Owusu - all dates.xlsx');
  });

  it('falls back when nothing has loaded yet', () => {
    expect(statementFileName(null, 'pdf')).toBe(
      'Statement - All customers - all dates.pdf',
    );
  });

  /* A customer called "A/B Trading" would otherwise make a path. */
  it('strips what a filename cannot hold', () => {
    expect(
      statementFileName(statement({ customerName: 'A/B: Trading' }), 'pdf'),
    ).toBe('Statement - AB Trading - 2026-07-01 to 2026-09-30.pdf');
  });
});
