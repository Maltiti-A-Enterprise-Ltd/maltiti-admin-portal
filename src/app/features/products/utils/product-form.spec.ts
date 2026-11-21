import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { createProductForm } from './product-form';

describe('createProductForm', () => {
  const form = (): ReturnType<typeof createProductForm> =>
    createProductForm(TestBed.inject(FormBuilder));

  it('does not require ingredients', () => {
    const control = form().controls.ingredients;
    control.setValue([]);

    expect(control.valid).toBeTrue();
  });

  for (const field of ['wholesale', 'retail', 'costPrice'] as const) {
    it(`refuses a ${field} of zero, below zero or blank`, () => {
      const control = form().controls[field];

      control.setValue(0);
      expect(control.hasError('positive')).toBeTrue();

      control.setValue(-1);
      expect(control.hasError('positive')).toBeTrue();

      control.setValue(null as unknown as number);
      expect(control.hasError('required')).toBeTrue();

      control.setValue(12.5);
      expect(control.valid).toBeTrue();
    });
  }

  it('starts with the prices unsaveable until they are filled in', () => {
    const f = form();

    expect(f.controls.wholesale.valid).toBeFalse();
    expect(f.controls.retail.valid).toBeFalse();
    expect(f.controls.costPrice.valid).toBeFalse();
  });
});
