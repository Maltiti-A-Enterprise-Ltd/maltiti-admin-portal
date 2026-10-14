/**
 * Payment Form Modal
 *
 * One dialog for both halves of the job: recording a new instalment against a
 * sale, and correcting one that was entered wrongly. The form is identical,
 * so sharing it is what keeps the two from drifting apart.
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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { MessageModule } from 'primeng/message';

// Local
import { take } from 'rxjs';
import { SalesPaymentsApiService } from '../../services/sales-payments-api.service';
import { PaymentAccountApiService } from '@features/payment-accounts/services/payment-account-api.service';
import { paymentAccountLabel } from '@features/payment-accounts/models/payment-account.model';
import {
  InvoiceCurrency,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  PaymentRecordStatus,
  RecordPaymentRequest,
  SalePaymentRecord,
  SalePaymentSummary,
  UpdatePaymentRequest,
} from '../../models/sale.model';

import { currencySymbol, formatSaleAmount } from '@shared/utils/sale-money';
interface PaymentMethodOption {
  label: string;
  value: PaymentMethod;
}

interface PaymentStatusOption {
  label: string;
  value: PaymentRecordStatus;
}

@Component({
  selector: 'app-payment-form-modal',
  templateUrl: './payment-form-modal.component.html',
  styleUrls: ['./payment-form-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    SelectModule,
    TextareaModule,
    InputTextModule,
    MessageModule,
  ],
})
export class PaymentFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly paymentsApi = inject(SalesPaymentsApiService);
  private readonly paymentAccountApi = inject(PaymentAccountApiService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted after a payment is recorded or corrected, so the list reloads. */
  public readonly paymentAdded = output<void>();

  // ─── State ──────────────────────────────────────────────────────────────────
  public readonly visible = signal(false);
  public readonly loading = signal(false);
  public readonly errorMessage = signal<string | null>(null);
  private readonly saleId = signal<string | null>(null);
  private readonly summary = signal<SalePaymentSummary | null>(null);

  /** The payment being corrected, or null when recording a new one. */
  private readonly editing = signal<SalePaymentRecord | null>(null);
  public readonly isEditing = computed(() => !!this.editing());

  public readonly heading = computed(() =>
    this.isEditing() ? 'Edit Payment' : 'Record Payment',
  );
  public readonly submitLabel = computed(() =>
    this.isEditing() ? 'Save Changes' : 'Record Payment',
  );

  /**
   * The sale's currency. A payment is always recorded in it, so the field is
   * labelled with it and the balance it is checked against is in it too.
   */
  public readonly currency = signal<InvoiceCurrency | undefined>(undefined);
  public readonly symbol = computed(() =>
    currencySymbol({ currency: this.currency() }),
  );
  public readonly isForeign = computed(
    () => this.currency() !== undefined && this.currency() !== InvoiceCurrency.GHS,
  );

  public readonly balanceRemaining = computed(() => this.summary()?.balanceRemaining ?? 0);
  public readonly isFullyPaid = computed(() => this.summary()?.isFullyPaid ?? false);
  public readonly showOverpayWarning = computed(() => {
    // Suppressed while editing: the balance already counts this payment, so
    // comparing against it would warn about money the sale is not owed.
    if (this.isEditing()) {
      return false;
    }

    const amount = this.form.controls.amount.value ?? 0;
    return amount > 0 && amount > this.balanceRemaining() && this.balanceRemaining() > 0;
  });

  // ─── Form ────────────────────────────────────────────────────────────────────
  public readonly form = this.fb.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    paymentMethod: [PaymentMethod.BANK_TRANSFER, Validators.required],
    status: [PaymentRecordStatus.CONFIRMED, Validators.required],
    reference: [''],
    note: [''],
    // Optional: cash arrives in no account, and the business may not care to
    // record one. Only accounts still in use are offered.
    paymentAccountId: [null as string | null],
  });

  // ─── Select options ──────────────────────────────────────────────────────────
  public readonly methodOptions: PaymentMethodOption[] = (
    Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]
  ).map((key) => ({ label: PAYMENT_METHOD_LABELS[key], value: key }));

  /** Accounts still in use, as "Bank — number (currency)". */
  public readonly accountOptions = signal<{ label: string; value: string }[]>([]);

  public readonly statusOptions: PaymentStatusOption[] = [
    { label: 'Confirmed', value: PaymentRecordStatus.CONFIRMED },
    { label: 'Pending', value: PaymentRecordStatus.PENDING },
    { label: 'Failed', value: PaymentRecordStatus.FAILED },
  ];

  /**
   * Open the modal for the given sale and pre-load the payment summary
   * (used to display balance remaining and overpay warnings).
   */
  public open(
    saleId: string,
    summary: SalePaymentSummary | null = null,
    currency?: InvoiceCurrency,
  ): void {
    this.currency.set(currency);
    this.editing.set(null);
    this.saleId.set(saleId);
    this.summary.set(summary);
    this.errorMessage.set(null);
    this.form.reset({
      amount: 0,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      status: PaymentRecordStatus.CONFIRMED,
      reference: '',
      note: '',
      paymentAccountId: null,
    });
    this.loadPaymentAccounts();
    this.visible.set(true);
  }

  /** Open the same form over an existing payment, to correct it. */
  public openForEdit(
    saleId: string,
    payment: SalePaymentRecord,
    summary: SalePaymentSummary | null = null,
    currency?: InvoiceCurrency,
  ): void {
    /* The payment's own currency where it has one — a correction is read in
       the money that actually arrived, not in whatever the sale is now. */
    this.currency.set(payment.currency ?? currency);
    this.editing.set(payment);
    this.saleId.set(saleId);
    this.summary.set(summary);
    this.errorMessage.set(null);
    this.form.reset({
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      reference: payment.reference ?? '',
      note: payment.note ?? '',
      paymentAccountId: payment.paymentAccountId ?? null,
    });
    this.loadPaymentAccounts();
    this.visible.set(true);
  }

  /**
   * Retired accounts are left out: money cannot arrive in an account that is
   * no longer in use, and the API refuses one anyway.
   */
  private loadPaymentAccounts(): void {
    this.paymentAccountApi
      .getAll(true)
      .pipe(take(1))
      .subscribe({
        next: (accounts) =>
          this.accountOptions.set(
            this.withCurrentAccount(
              accounts.map((account) => ({
                label: paymentAccountLabel(account),
                value: account.id,
              })),
            ),
          ),
        // Not being able to list accounts should not block recording the
        // payment — the link is optional.
        error: () => this.accountOptions.set(this.withCurrentAccount([])),
      });
  }

  /**
   * Keeps the account a payment is already linked to in the list, even once
   * it has been retired.
   *
   * Without this the select would open blank on a retired account and saving
   * would quietly detach it — erasing the record of where the money actually
   * went, which is the one thing this link exists to preserve.
   */
  private withCurrentAccount(
    options: { label: string; value: string }[],
  ): { label: string; value: string }[] {
    const payment = this.editing();
    const id = payment?.paymentAccountId;

    if (!id || options.some((option) => option.value === id)) {
      return options;
    }

    return [
      {
        label: `${payment?.paymentAccountLabel ?? 'Account'} — no longer in use`,
        value: id,
      },
      ...options,
    ];
  }

  public close(): void {
    this.visible.set(false);
    this.form.reset();
    this.saleId.set(null);
    this.errorMessage.set(null);
  }

  public onSubmit(): void {
    if (this.form.invalid || !this.saleId()) {
      this.form.markAllAsTouched();
      return;
    }

    const editing = this.editing();

    this.loading.set(true);
    this.errorMessage.set(null);

    const request$ = editing
      ? this.paymentsApi.updatePayment(this.saleId()!, editing.id, this.editBody())
      : this.paymentsApi.recordPayment(this.saleId()!, this.recordBody());

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: editing ? 'Payment Updated' : 'Payment Recorded',
            detail: editing
              ? `Payment corrected to ${formatSaleAmount(record.amount, { currency: this.currency() })}.`
              : `Payment of ${formatSaleAmount(record.amount, { currency: this.currency() })} recorded.`,
          });
          this.paymentAdded.emit();
          this.close();
        },
        error: (err: { status?: number }) => {
          this.loading.set(false);
          this.errorMessage.set(this.mapHttpError(err.status));
        },
      });
  }

  private recordBody(): RecordPaymentRequest {
    const { amount, paymentMethod, status, reference, note, paymentAccountId } =
      this.form.getRawValue();

    return {
      amount: amount ?? 0,
      paymentMethod: paymentMethod ?? PaymentMethod.BANK_TRANSFER,
      status: status ?? PaymentRecordStatus.CONFIRMED,
      reference: reference || undefined,
      note: note || undefined,
      // Omitted rather than null when unset: the API rejects unknown shapes
      // less forgivingly than a missing optional.
      paymentAccountId: paymentAccountId || undefined,
      isCustomerInitiated: false,
    };
  }

  /**
   * The whole form, with blanks sent as explicit nulls.
   *
   * The API leaves out what it is not sent, so clearing a reference has to be
   * stated rather than implied — an omitted field would read as "leave it as
   * it was", which is the opposite of what an emptied box means.
   */
  private editBody(): UpdatePaymentRequest {
    const { amount, paymentMethod, status, reference, note, paymentAccountId } =
      this.form.getRawValue();

    return {
      amount: amount ?? 0,
      paymentMethod: paymentMethod ?? PaymentMethod.BANK_TRANSFER,
      status: status ?? PaymentRecordStatus.CONFIRMED,
      reference: reference?.trim() || null,
      note: note?.trim() || null,
      paymentAccountId: paymentAccountId || null,
    };
  }

  private mapHttpError(status?: number): string {
    switch (status) {
      case 400:
        return 'Invalid payment details. Please check the amount and try again.';
      case 401:
        return 'Session expired. Please log in again.';
      case 403:
        return "You don't have permission to perform this action.";
      case 404:
        return 'Sale or payment record not found.';
      default:
        return 'Something went wrong. Please try again later.';
    }
  }
}
