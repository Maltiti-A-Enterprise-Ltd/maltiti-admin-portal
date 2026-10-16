import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { FormFieldBaseComponent } from '../base/form-field-base.component';

@Component({
  selector: 'app-number-input',
  templateUrl: './number-input.component.html',
  styleUrl: '../base/form-field-base.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputNumberModule, MessageModule],
})
export class NumberInputComponent extends FormFieldBaseComponent {
  public readonly currency = input<string>('GHS');
  public readonly locale = input<string>('en-GH');
  public readonly max = input<number | undefined>(undefined);
  public readonly min = input<number | undefined>(undefined);
  public readonly mode = input<'decimal' | 'currency'>('decimal');

  /*
   * How many decimal places the field will accept and show.
   *
   * Left undefined the field inherits whatever `Intl.NumberFormat` decides
   * for the locale, which is not a decision anyone made about this field —
   * and every other decimal input in this app sets both explicitly on a
   * raw `p-inputNumber` precisely because of that. Exposing them here
   * means a field that needs decimals can say so instead of hoping.
   */
  public readonly minFractionDigits = input<number | undefined>(undefined);
  public readonly maxFractionDigits = input<number | undefined>(undefined);

  /**
   * How many decimals a decimal field takes when nobody has said.
   *
   * Leaving this undefined is what stopped a box dimension, and then a
   * sale price in CAD, from accepting a decimal point at all. PrimeNG
   * gates the keystroke on the input being set:
   *
   * ```ts
   * else if (decimalCharIndex === -1 && this.maxFractionDigits) {
   * ```
   *
   * — so on a field with no decimal point in it yet, pressing `.` with
   * `maxFractionDigits` undefined is swallowed and nothing happens. It is
   * only the *typing* path; writing a value in programmatically always
   * worked, which is why this survived the tests written for the
   * dimensions report.
   *
   * Three places, because that is what `Intl.NumberFormat` already
   * resolves for this locale — so nothing's display changes, only the
   * keystroke gate opens. A field that must stay whole says `0`, which is
   * falsy and so keeps the gate shut, now by declaration rather than by
   * accident.
   *
   * Currency mode needs nothing: it pads to the currency's own two places,
   * so the decimal point is always already there and the keystroke takes
   * the ordinary digit path.
   */
  protected readonly resolvedMaxFractionDigits = computed(() => {
    const stated = this.maxFractionDigits();

    if (stated !== undefined) {
      return stated;
    }

    return this.mode() === 'decimal' ? 3 : undefined;
  });
  public readonly prefix = input<string>('');
  public readonly suffix = input<string>('');
  public readonly disabled = input<boolean>(false);
  public readonly readonly = input<boolean>(false);
  public readonly required = input<boolean>(false);
}
