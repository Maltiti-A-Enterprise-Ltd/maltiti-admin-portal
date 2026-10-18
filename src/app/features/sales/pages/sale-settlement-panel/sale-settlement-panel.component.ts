/**
 * Recording the payment that makes "Paid" true.
 *
 * A sale's payment status and its payment records are two different things:
 * the status is a label an admin picks, the records are the ledger the
 * balance is worked out from. Changing the label on its own left a sale
 * reading "Paid" above a progress bar still stuck at 0% and a balance that
 * had never moved — the sale said one thing and its own payments page said
 * another.
 *
 * So when an admin marks a sale paid, or part paid, while the ledger still
 * shows money outstanding, this offers to record the payment that would
 * account for it. Method, account and reference come with it, because a
 * payment with no provenance is worth little to whoever reconciles it
 * against a bank statement later.
 *
 * The resulting status is then left to the server, which derives Paid, Part
 * Payment and Pending Payment from the confirmed records every time one
 * lands. Recording the money is enough; sending a status alongside it would
 * only be a second opinion about the same facts, and the two could disagree.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of, take, tap, throwError } from 'rxjs';

// PrimeNG
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

// Local
import { SalesPaymentsApiService } from '../../services/sales-payments-api.service';
import { PaymentAccountApiService } from '@features/payment-accounts/services/payment-account-api.service';
import {
  PaymentAccountOption,
  paymentAccountOptions,
} from '../../utils/payment-account-options';
import {
  InvoiceCurrency,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  PaymentRecordStatus,
  PaymentStatus,
  SalePaymentSummary,
} from '../../models/sale.model';
import { currencySymbol } from '@shared/utils/sale-money';

/** The two statuses that claim money has come in. */
const SETTLING_STATUSES: readonly PaymentStatus[] = [
  PaymentStatus.PAID,
  PaymentStatus.PART_PAYMENT,
];

@Component({
  selector: 'app-sale-settlement-panel',
  templateUrl: './sale-settlement-panel.component.html',
  styleUrls: ['./sale-settlement-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
  ],
})
export class SaleSettlementPanelComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly paymentsApi = inject(SalesPaymentsApiService);
  private readonly paymentAccountApi = inject(PaymentAccountApiService);

  /** Null while a sale is being created — there is no ledger to settle yet. */
  public readonly saleId = input<string | null>(null);
  /** The sale's own currency. Payments are recorded in it. */
  public readonly currency = input<InvoiceCurrency | undefined>(undefined);
  /** The status currently chosen in the form, not the one last saved. */
  public readonly paymentStatus = input<PaymentStatus | null>(null);

  // ─── State ──────────────────────────────────────────────────────────────────
  private readonly summary = signal<SalePaymentSummary | null>(null);
  public readonly recording = signal(false);
  public readonly errorMessage = signal<string | null>(null);

  public readonly balanceRemaining = computed(() => this.summary()?.balanceRemaining ?? 0);
  public readonly totalPaid = computed(() => this.summary()?.totalPaid ?? 0);
  public readonly symbol = computed(() => currencySymbol({ currency: this.currency() }));
  public readonly isMarkingPaid = computed(() => this.paymentStatus() === PaymentStatus.PAID);

  /**
   * Whether there is anything to offer.
   *
   * Only on an existing sale, only once its ledger is known, only while the
   * chosen status claims money has arrived, and only while some of it is
   * still unaccounted for. A sale whose payments already cover the total
   * needs nothing from this panel and should not be nagged by it.
   */
  public readonly applies = computed(
    () =>
      !!this.saleId() &&
      !!this.summary() &&
      this.balanceRemaining() > 0 &&
      SETTLING_STATUSES.includes(this.paymentStatus() as PaymentStatus),
  );

  // ─── Form ────────────────────────────────────────────────────────────────────
  public readonly form = this.fb.group({
    record: [true],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    paymentMethod: [PaymentMethod.BANK_TRANSFER, Validators.required],
    paymentAccountId: [null as string | null],
    reference: [''],
  });

  /** Reactive-form values are not signals, so the template reads these. */
  private readonly recordTicked = toSignal(this.form.controls.record.valueChanges, {
    initialValue: this.form.controls.record.value,
  });
  private readonly amountTyped = toSignal(this.form.controls.amount.valueChanges, {
    initialValue: this.form.controls.amount.value,
  });

  /** Whether saving the sale will also record a payment. */
  public readonly willRecord = computed(() => this.applies() && !!this.recordTicked());

  /**
   * True once the amount entered would clear the balance outright.
   *
   * Worth saying out loud under Part Payment, where it means the sale is
   * about to come back as Paid rather than part paid — surprising if it is
   * not pointed out, and perfectly reasonable if it is.
   */
  public readonly clearsBalance = computed(
    () => (this.amountTyped() ?? 0) >= this.balanceRemaining() && this.balanceRemaining() > 0,
  );

  public readonly methodOptions = (
    Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]
  ).map((key) => ({ label: PAYMENT_METHOD_LABELS[key], value: key }));

  /** Accounts still in use, as "Bank — number (currency)". */
  public readonly accountOptions = signal<PaymentAccountOption[]>([]);

  public ngOnInit(): void {
    const saleId = this.saleId();

    if (!saleId) {
      return;
    }

    this.loadSummary(saleId);
    this.loadPaymentAccounts();
  }

  /**
   * Record the payment, if one is armed, and say whether it happened.
   *
   * The caller saves the sale only once this completes, so a payment that
   * fails to record never leaves a sale labelled Paid behind it. `false`
   * means nothing was recorded and the caller should save as it normally
   * would.
   */
  public settle(): Observable<boolean> {
    if (!this.willRecord()) {
      return of(false);
    }

    const saleId = this.saleId();
    const { amount, paymentMethod, paymentAccountId, reference } = this.form.getRawValue();

    if (!saleId || !amount || amount <= 0) {
      this.form.controls.amount.markAsTouched();
      return throwError(() => new Error('A settling payment needs an amount.'));
    }

    this.recording.set(true);
    this.errorMessage.set(null);

    return this.paymentsApi
      .recordPayment(saleId, {
        amount,
        paymentMethod: paymentMethod ?? PaymentMethod.BANK_TRANSFER,
        /* Confirmed, because this is the admin stating the money is in.
           Anything less would not move the balance, which is the whole
           point of the panel. */
        status: PaymentRecordStatus.CONFIRMED,
        reference: reference?.trim() || undefined,
        paymentAccountId: paymentAccountId || undefined,
        note: 'Recorded while updating the sale’s payment status.',
        isCustomerInitiated: false,
      })
      .pipe(
        tap(() => this.recording.set(false)),
        map(() => true),
        catchError((error: unknown) => {
          this.recording.set(false);
          this.errorMessage.set(
            'The payment could not be recorded, so the sale has not been saved. Please try again.',
          );
          return throwError(() => error);
        }),
      );
  }

  private loadSummary(saleId: string): void {
    this.paymentsApi
      .getPaymentSummary(saleId)
      .pipe(take(1))
      .subscribe({
        next: (summary) => {
          this.summary.set(summary);
          this.form.controls.amount.setValue(summary.balanceRemaining);
        },
        /* Silently: the panel simply does not appear. Not being able to read
           the ledger is no reason to block an admin from saving the sale. */
        error: () => this.summary.set(null),
      });
  }

  private loadPaymentAccounts(): void {
    paymentAccountOptions(this.paymentAccountApi).subscribe((options) =>
      this.accountOptions.set(options),
    );
  }
}
