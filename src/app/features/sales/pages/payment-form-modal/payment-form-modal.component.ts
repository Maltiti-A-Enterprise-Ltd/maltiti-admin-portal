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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

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
import { SalesPaymentsApiService } from '../../services/sales-payments-api.service';
import { PaymentAccountApiService } from '@features/payment-accounts/services/payment-account-api.service';
import {
  PaymentAccountOption,
  paymentAccountOptions,
} from '../../utils/payment-account-options';
import { paymentErrorMessage } from '../../utils/payment-error-message';
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
import { CrossCurrencyPayment } from '../../utils/cross-currency-payment';
import { DecimalPipe } from '@angular/common';
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
    DecimalPipe,
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
    /* What the customer actually handed over, when that was not the sale's
       own money. Left on the sale's currency these do nothing. */
    receivedCurrency: [null as InvoiceCurrency | null],
    receivedAmount: [null as number | null],
    receivedRate: [null as number | null],
  });

  /** The money that actually arrived, when it was not the sale's own. */
  public readonly received = new CrossCurrencyPayment(
    this.form.controls.receivedCurrency,
    this.form.controls.receivedAmount,
    this.form.controls.receivedRate,
    this.currency,
    this.form.controls.amount,
  );

  /**
   * The amount typed so far, as a signal.
   *
   * A `computed` reading `form.controls.amount.value` directly never
   * re-evaluates — a reactive form control is not a signal, so nothing tells
   * the graph it changed. Everything below that reacts to what has been typed
   * reads this instead.
   */
  private readonly amountTyped = toSignal(this.form.controls.amount.valueChanges, {
    initialValue: this.form.controls.amount.value,
  });

  public readonly showOverpayWarning = computed(() => {
    // Suppressed while editing: the balance already counts this payment, so
    // comparing against it would warn about money the sale is not owed.
    if (this.isEditing()) {
      return false;
    }

    const amount = this.amountTyped() ?? 0;
    return amount > 0 && amount > this.balanceRemaining() && this.balanceRemaining() > 0;
  });

  /**
   * Whether to offer "the whole balance" as a one-click amount.
   *
   * Paying a sale off in full is the common case, and re-typing a figure the
   * page is already showing is both a chore and a chance to fat-finger a digit.
   *
   * Hidden while editing (the balance already counts the payment being
   * corrected, so filling it in would double it) and while the money arrived
   * in another currency, where the amount is derived from what was received
   * rather than entered.
   */
  public readonly canFillBalance = computed(
    () =>
      !this.isEditing() &&
      !this.received.isCrossCurrency() &&
      this.balanceRemaining() > 0,
  );

  /** True once the amount box holds exactly the outstanding balance. */
  public readonly isFullBalance = computed(
    () => this.canFillBalance() && (this.amountTyped() ?? 0) === this.balanceRemaining(),
  );

  // ─── Select options ──────────────────────────────────────────────────────────
  public readonly methodOptions: PaymentMethodOption[] = (
    Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]
  ).map((key) => ({ label: PAYMENT_METHOD_LABELS[key], value: key }));

  /** Accounts still in use, as "Bank — number (currency)". */
  public readonly accountOptions = signal<PaymentAccountOption[]>([]);

  public readonly statusOptions: PaymentStatusOption[] = [
    { label: 'Confirmed', value: PaymentRecordStatus.CONFIRMED },
    { label: 'Pending', value: PaymentRecordStatus.PENDING },
    { label: 'Failed', value: PaymentRecordStatus.FAILED },
  ];

  /**
   * Open the modal for the given sale and pre-load the payment summary
   * (used to display balance remaining and overpay warnings).
   *
   * @param options.prefillBalance Opens with the outstanding balance already
   * in the amount box. For the callers that are settling a sale outright —
   * the "record the settling payment" prompt on a sale marked paid — where
   * the figure is not in question and asking for it again is only a chance to
   * get it wrong.
   */
  public open(
    saleId: string,
    summary: SalePaymentSummary | null = null,
    currency?: InvoiceCurrency,
    options: { prefillBalance?: boolean } = {},
  ): void {
    this.currency.set(currency);
    this.editing.set(null);
    this.saleId.set(saleId);
    this.summary.set(summary);
    this.errorMessage.set(null);
    this.form.reset({
      amount: options.prefillBalance ? (summary?.balanceRemaining ?? 0) : 0,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      status: PaymentRecordStatus.CONFIRMED,
      reference: '',
      note: '',
      paymentAccountId: null,
    });
    this.loadPaymentAccounts();
    this.visible.set(true);
  }

  /**
   * Put the whole outstanding balance in the amount box.
   *
   * `emitEvent` is left on so the overpay warning and the "full balance"
   * highlight follow the click; the control's own valueChanges is what drives
   * both.
   */
  public fillFullBalance(): void {
    this.form.controls.amount.setValue(this.balanceRemaining());
    this.form.controls.amount.markAsDirty();
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

  /** Active accounts, plus the retired one this payment already points at. */
  private loadPaymentAccounts(): void {
    const payment = this.editing();

    paymentAccountOptions(this.paymentAccountApi, {
      id: payment?.paymentAccountId,
      label: payment?.paymentAccountLabel,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((options) => this.accountOptions.set(options));
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
          this.errorMessage.set(paymentErrorMessage(err.status));
        },
      });
  }

  private recordBody(): RecordPaymentRequest {
    const {
      amount,
      paymentMethod,
      status,
      reference,
      note,
      paymentAccountId,
      receivedCurrency,
      receivedAmount,
      receivedRate,
    } = this.form.getRawValue();

    /* Sent only when the money really did arrive in something else. The API
       derives the settled amount from these, so the figure on the bank
       statement is what gets typed and the conversion is not done twice. */
    const crossCurrency = this.received.isCrossCurrency()
      ? {
          receivedAmount: receivedAmount ?? undefined,
          receivedCurrency: receivedCurrency ?? undefined,
          receivedRate: receivedRate ?? undefined,
        }
      : {};

    return {
      ...crossCurrency,
      /* Omitted on a cross-currency payment: the API derives it from what
         arrived, and sending both invites two numbers that disagree about
         the same payment. */
      amount: this.received.isCrossCurrency() ? undefined : (amount ?? 0),
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
}
