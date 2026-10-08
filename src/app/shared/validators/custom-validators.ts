import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {
  /**
   * Group-level validator: requires at least one of the listed controls to hold
   * a non-blank value. Use for "either/or" fields such as a customer's contact
   * name and organization name.
   *
   * Sets `atLeastOneRequired` on the group and marks each listed control with
   * the same error so field-level error slots can render it.
   */
  public static atLeastOneRequired(controlNames: string[]): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const controls = controlNames
        .map((name) => group.get(name))
        .filter((control): control is AbstractControl => control !== null);

      const satisfied = controls.some(
        (control) => typeof control.value === 'string' && control.value.trim().length > 0,
      );

      for (const control of controls) {
        const errors = { ...(control.errors ?? {}) };
        const hadError = 'atLeastOneRequired' in errors;

        if (satisfied && hadError) {
          delete errors['atLeastOneRequired'];
          control.setErrors(Object.keys(errors).length ? errors : null);
        } else if (!satisfied && !hadError) {
          control.setErrors({ ...errors, atLeastOneRequired: true });
        }
      }

      return satisfied ? null : { atLeastOneRequired: true };
    };
  }

  public static strongPassword(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    // At least one uppercase letter, one lowercase letter, one number, and one special character
    const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const valid = pattern.test(value);
    return valid ? null : { weakPassword: true };
  }

  public static passwordMatch(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }
}
