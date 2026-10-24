/**
 * Recording what a customer owed before this system kept their books.
 *
 * Its own dialog rather than the sale form, because almost nothing the sale
 * form asks for applies: there are no products to pick, no batches to
 * allocate, no delivery to charge and no status to choose. What it asks for
 * instead is the figure, the day it is stated as at, and where the number
 * came from.
 *
 * That last one is the point of the dialog. The records behind the figure
 * are lost, so the note is the only account of why it is what it is — and
 * "where did GH₵4,200 come from?" gets asked months later.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

// Local
import { SalesApiService } from '../../services/sales-api.service';
import { CustomerSelectComponent } from '@shared/components/customer-virtual-select/customer-select.component';
import { CurrencyRateState } from '../../services/currency-rate.state';
import { InvoiceCurrency, Sale } from '../../models/sale.model';
import { asPlainDay } from '../../utils/opening-balance-payload';

@Component({
  selector: 'app-opening-balance-dialog',
  standalone: true,
  templateUrl: './opening-balance-dialog.component.html',
  styleUrls: ['./opening-balance-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CurrencyRateState],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    DatePickerModule,
    SelectModule,
    CustomerSelectComponent,
  ],
})
export class OpeningBalanceDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(SalesApiService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  /** The currency the debt is in, and the rate it is pinned at. */
  public readonly deal = inject(CurrencyRateState);

  public readonly saved = output<void>();

  public readonly visible = signal(false);
  public readonly saving = signal(false);
  public readonly errorMessage = signal<string | null>(null);

  /** The one being corrected, or null when recording a new one. */
  private readonly editing = signal<Sale | null>(null);
  public readonly isEditing = computed(() => !!this.editing());
  public readonly heading = computed(() =>
    this.isEditing() ? 'Correct opening balance' : 'Record opening balance',
  );

  /**
   * Today. A debt carried in from before this system cannot be stated as at
   * a date that has not happened.
   */
  public readonly maxAsOf = new Date();

  public readonly form = this.fb.group({
    customerId: this.fb.control('', { validators: [Validators.required] }),
    amount: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    asOf: this.fb.control<Date | null>(null, {
      validators: [Validators.required],
    }),
    note: this.fb.control(''),
  });

  /** Recording a new one. */
  public open(): void {
    this.editing.set(null);
    this.errorMessage.set(null);
    this.deal.reset();
    this.form.reset({ customerId: '', amount: null, asOf: null, note: '' });
    this.form.controls.customerId.enable();
    this.visible.set(true);
  }

  /**
   * Correcting one.
   *
   * The customer and the currency are fixed: moving a debt between customers
   * or restating it in another money is not a correction, it is a different
   * debt. Either is done by removing this one and recording the right one.
   */
  public openForEdit(sale: Sale): void {
    this.editing.set(sale);
    this.errorMessage.set(null);
    this.deal.reset(sale.currency, sale.exchangeRate);
    this.form.reset({
      customerId: sale.customer?.id ?? sale.customerId ?? '',
      amount: sale.amount ?? null,
      asOf: sale.openingBalanceAsOf ? new Date(sale.openingBalanceAsOf) : null,
      note: sale.openingBalanceNote ?? '',
    });
    this.form.controls.customerId.disable();
    this.visible.set(true);
  }

  public close(): void {
    this.visible.set(false);
    this.editing.set(null);
    this.errorMessage.set(null);
  }

  /** A foreign debt with no rate would book at 1:1 — five hundred cedis. */
  public readonly saveDisabled = computed(
    () => this.saving() || this.deal.needsRate(),
  );

  public onSave(): void {
    if (this.form.invalid || this.deal.needsRate()) {
      this.form.markAllAsTouched();
      return;
    }

    const { amount, asOf, note } = this.form.getRawValue();
    const editing = this.editing();

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = editing
      ? this.api.updateOpeningBalance(editing.id, {
          amount: amount ?? undefined,
          asOf: asPlainDay(asOf) ?? undefined,
          note: note?.trim() || null,
        })
      : this.api.createOpeningBalance({
          customerId: this.form.getRawValue().customerId ?? '',
          amount: amount ?? 0,
          currency: this.deal.currency(),
          exchangeRate: this.deal.exchangeRate() ?? undefined,
          asOf: asPlainDay(asOf) ?? '',
          note: note?.trim() || undefined,
        });

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: editing
            ? 'Opening balance corrected.'
            : 'Opening balance recorded. It is now counted in what you are owed.',
        });
        this.saved.emit();
        this.close();
      },
      error: (error: { status?: number; error?: { message?: string } }) => {
        this.saving.set(false);
        /* The one-per-customer rule lives on the server, so its wording is
           what explains the conflict. */
        this.errorMessage.set(
          error?.error?.message ??
            (error.status === 409
              ? 'This customer already has an opening balance. Correct that one instead.'
              : 'Could not save the opening balance. Please try again.'),
        );
      },
    });
  }

  protected readonly InvoiceCurrency = InvoiceCurrency;
}
