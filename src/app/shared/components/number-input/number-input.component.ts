import { ChangeDetectionStrategy, Component, input } from '@angular/core';
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
  public readonly prefix = input<string>('');
  public readonly suffix = input<string>('');
  public readonly disabled = input<boolean>(false);
  public readonly readonly = input<boolean>(false);
  public readonly required = input<boolean>(false);
}
