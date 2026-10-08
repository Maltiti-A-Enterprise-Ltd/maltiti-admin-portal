/**
 * Field Renderer Component
 * Renders form fields in either view or edit mode
 * Reduces template complexity by abstracting conditional rendering
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { Checkbox } from 'primeng/checkbox';
import { InputComponent } from '../input/input.component';
import { TextareaComponent } from '../textarea/textarea.component';
import { SelectComponent } from '../select/select.component';
import { NumberInputComponent } from '../number-input/number-input.component';

type Value = string | number | boolean | Date | null | string[] | undefined;
export type FieldMode = 'view' | 'edit';
export type FieldType =
  | 'input'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'number'
  | 'date'
  | 'checkbox';

export interface SelectOption {
  label: string;
  value: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-field-renderer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePicker,
    Checkbox,
    InputComponent,
    TextareaComponent,
    SelectComponent,
    NumberInputComponent,
  ],
  templateUrl: './field-renderer.component.html',
  styleUrl: './field-renderer.component.scss',
})
export class FieldRendererComponent {
  // Required inputs
  public readonly mode = input.required<FieldMode>();
  public readonly type = input.required<FieldType>();
  public readonly label = input.required<string>();

  // Conditional inputs
  public readonly control = input<FormControl | null>(null);
  public readonly value = input<Value>(null);
  public readonly options = input<SelectOption[]>([]);
  public readonly placeholder = input<string>('');
  /** Short guidance shown beneath the field while editing. */
  public readonly hint = input<string>('');
  public readonly required = input<boolean>(false);
  public readonly styleClass = input<string>('');
  public readonly isMultiSelect = input<boolean>(false);
  public readonly showClear = input<boolean>(false);
  public readonly maxDate = input<Date | null>(null);
  public readonly minDate = input<Date | null>(null);
  public readonly showIcon = input<boolean>(false);
  public readonly max = input<number | null>(null);
  public readonly min = input<number | null>(null);
  public readonly locale = input<string>('en-GH');
  public readonly numberMode = input<'currency' | undefined>(undefined);
  public readonly currency = input<string>('GHS');
  public readonly maxSelectedLabels = input<number>(3);
  public readonly selectedItemsLabel = input<string>('{0} items selected');
  public readonly optionLabel = input<string>('label');
  public readonly optionValue = input<string>('value');
  public readonly id = input<string>('');

  // Computed
  public readonly isViewMode = input<boolean>(false);
  public readonly isEditMode = input<boolean>(false);

  public readonly dateDisplay = computed(() => {
    return this.value() as string | Date;
  });

  // Computed display values
  public readonly selectDisplay = computed(() => {
    const opts = this.options();
    const val = this.value();
    const option = opts.find(({ value }) => value === val);
    return option ? option.label : 'N/A';
  });

  public readonly multiselectDisplay = computed(() => {
    const opts = this.options();
    const vals = this.value() as string[];
    const selectedLabels = opts
      .filter(({ value }) => vals.includes(value))
      .map(({ label }) => label);
    return selectedLabels.join(', ') || 'None';
  });

  protected readonly Number = Number;
}
