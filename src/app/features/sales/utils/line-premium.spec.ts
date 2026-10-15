import { FormControl } from '@angular/forms';
import { isPremiumIncomplete, LinePremium, linePremium } from './line-premium';
import { PremiumType } from '../models/sale.model';

describe('linePremium', () => {
  const base = { quantity: 10, price: 100 };

  /* Per unit, like the price: ten sacks at fifty each is five hundred. */
  it('multiplies a cash premium by the quantity', () => {
    expect(
      linePremium({ ...base, type: PremiumType.AMOUNT, value: 50 }),
    ).toBe(500);
  });

  it('takes a percentage off the line total', () => {
    expect(
      linePremium({ ...base, type: PremiumType.PERCENT, value: 10 }),
    ).toBe(100);
  });

  it('rounds a percentage to the cent', () => {
    expect(
      linePremium({
        quantity: 3,
        price: 33.33,
        type: PremiumType.PERCENT,
        value: 7.5,
      }),
    ).toBe(7.5);
  });

  it('is nothing with no premium set', () => {
    expect(linePremium({ ...base, type: null, value: null })).toBe(0);
  });

  it('is nothing with only one half set', () => {
    expect(linePremium({ ...base, type: PremiumType.AMOUNT, value: null })).toBe(0);
    expect(linePremium({ ...base, type: null, value: 50 })).toBe(0);
  });

  it('ignores a zero or negative value', () => {
    expect(linePremium({ ...base, type: PremiumType.AMOUNT, value: 0 })).toBe(0);
    expect(linePremium({ ...base, type: PremiumType.AMOUNT, value: -5 })).toBe(0);
  });

  it('is nothing for a line with no quantity', () => {
    expect(
      linePremium({ quantity: 0, price: 100, type: PremiumType.AMOUNT, value: 50 }),
    ).toBe(0);
  });

  /* A percentage of nothing is nothing; a cash premium still stands. The
     one place the two forms genuinely differ. */
  it('charges a cash premium on a free line but not a percentage', () => {
    expect(
      linePremium({ quantity: 10, price: 0, type: PremiumType.AMOUNT, value: 50 }),
    ).toBe(500);
    expect(
      linePremium({ quantity: 10, price: 0, type: PremiumType.PERCENT, value: 10 }),
    ).toBe(0);
  });
});

describe('isPremiumIncomplete', () => {
  /* The API rejects half a premium, so the form has to catch it first —
     learning the rule from a failed save is a poor way to learn it. */
  it('flags a type with no value', () => {
    expect(isPremiumIncomplete(PremiumType.AMOUNT, null)).toBeTrue();
  });

  it('flags a value with no type', () => {
    expect(isPremiumIncomplete(null, 50)).toBeTrue();
  });

  it('accepts both together', () => {
    expect(isPremiumIncomplete(PremiumType.AMOUNT, 50)).toBeFalse();
  });

  /* By far the common case: no premium at all is complete, not incomplete. */
  it('accepts neither', () => {
    expect(isPremiumIncomplete(null, null)).toBeFalse();
  });

  it('treats a zero value as not filled in', () => {
    expect(isPremiumIncomplete(PremiumType.AMOUNT, 0)).toBeTrue();
    expect(isPremiumIncomplete(null, 0)).toBeFalse();
  });
});

describe('LinePremium', () => {
  const build = (
    type: PremiumType | null,
    value: number | null,
    quantity = 10,
    price = 100,
  ): LinePremium =>
    new LinePremium(
      new FormControl<PremiumType | null>(type),
      new FormControl<number | null>(value),
      new FormControl<number | null>(quantity),
      () => price,
    );

  it('reads the premium off its controls', () => {
    expect(build(PremiumType.AMOUNT, 50).amount()).toBe(500);
  });

  it('reads the price through the callback it was given', () => {
    expect(build(PremiumType.PERCENT, 10, 2, 250).amount()).toBe(50);
  });

  it('reports a half-filled premium', () => {
    expect(build(PremiumType.AMOUNT, null).incomplete()).toBeTrue();
    expect(build(PremiumType.AMOUNT, 50).incomplete()).toBeFalse();
  });

  it('offers both forms to choose from', () => {
    expect(build(null, null).options.map((o) => o.value)).toEqual([
      PremiumType.AMOUNT,
      PremiumType.PERCENT,
    ]);
  });
});
