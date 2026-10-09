import { cleared } from './cleared';

/**
 * The bug this exists for: emptying a product's grade sent nothing at all, and
 * the API treats an absent field as "unchanged". The grade stayed set.
 */
describe('cleared', () => {
  it('turns emptiness into an explicit null', () => {
    expect(cleared(null)).toBeNull();
    expect(cleared(undefined)).toBeNull();
    expect(cleared('')).toBeNull();
    expect(cleared('   ')).toBeNull();
  });

  it('passes real values through untouched', () => {
    expect(cleared('A')).toBe('A');
    expect(cleared('Grade A')).toBe('Grade A');
    expect(cleared(42)).toBe(42);
  });

  // The `|| undefined` idiom this replaces discarded both of these.
  it('treats zero and false as values, not emptiness', () => {
    expect(cleared(0)).toBe(0);
    expect(cleared(false)).toBe(false);
  });

  it('leaves whitespace inside a value alone', () => {
    expect(cleared(' Shea Butter ')).toBe(' Shea Butter ');
  });
});
