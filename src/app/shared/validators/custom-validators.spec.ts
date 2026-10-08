import { FormControl } from '@angular/forms';
import { CustomValidators } from './custom-validators';

describe('CustomValidators.numeric', () => {
  const validate = (value: unknown): ReturnType<typeof CustomValidators.numeric> =>
    CustomValidators.numeric(new FormControl(value));

  for (const value of ['500', '0', '0.5', '1.25', ' 750 ']) {
    it(`accepts "${value}"`, () => {
      expect(validate(value)).toBeNull();
    });
  }

  // The point of the rule: the unit belongs to the Unit of Measurement select,
  // so a unit typed into the weight field would be rendered twice.
  for (const value of ['500g', '1kg', '500 g', 'abc', '-5', '1.2.3', '1,5']) {
    it(`rejects "${value}"`, () => {
      expect(validate(value)).toEqual({ numeric: true });
    });
  }

  it('treats a blank value as valid so the field stays optional', () => {
    expect(validate('')).toBeNull();
    expect(validate('   ')).toBeNull();
    expect(validate(null)).toBeNull();
    expect(validate(undefined)).toBeNull();
  });
});
