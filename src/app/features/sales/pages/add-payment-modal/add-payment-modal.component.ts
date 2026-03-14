/**
 * Add Payment Modal Component
 * Modal dialog that allows admins to record a new payment instalment for a sale.
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
import { SalesPaymentsApiService } from '../../services/sales-payments-api.service';
import {
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  PaymentRecordStatus,
  RecordPaymentRequest,
  SalePaymentSummary,
} from '../../models/sale.model';

interface PaymentMethodOption {
  label: string;
  value: PaymentMethod;
}

interface PaymentStatusOption {
  label: string;
  value: PaymentRecordStatus;
}

@Component({
  selector: 'app-add-payment-modal',
  templateUrl: './add-payment-modal.component.html',
  styleUrls: ['./add-payment-modal.component.scss'],
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
export class AddPaymentModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly paymentsApi = inject(SalesPaymentsApiService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted after a payment is successfully recorded; carries the updated summary. */
  public readonly paymentAdded = output<void>();

  // ─── State ──────────────────────────────────────────────────────────────────
  public readonly visible = signal(false);
  public readonly loading = signal(false);
  public readonly errorMessage = signal<string | null>(null);
  private readonly saleId = signal<string | null>(null);
  private readonly summary = signal<SalePaymentSummary | null>(null);

  public readonly balanceRemaining = computed(() => this.summary()?.balanceRemaining ?? 0);
  public readonly isFullyPaid = computed(() => this.summary()?.isFullyPaid ?? false);
  public readonly showOverpayWarning = computed(() => {
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
  });

  // ─── Select options ──────────────────────────────────────────────────────────
  public readonly methodOptions: PaymentMethodOption[] = (
    Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]
  ).map((key) => ({ label: PAYMENT_METHOD_LABELS[key], value: key }));

  public readonly statusOptions: PaymentStatusOption[] = [
    { label: 'Confirmed', value: PaymentRecordStatus.CONFIRMED },
    { label: 'Pending', value: PaymentRecordStatus.PENDING },
    { label: 'Failed', value: PaymentRecordStatus.FAILED },
  ];

  /**
   * Open the modal for the given sale and pre-load the payment summary
   * (used to display balance remaining and overpay warnings).
   */
  public open(saleId: string, summary: SalePaymentSummary | null = null): void {
    this.saleId.set(saleId);
    this.summary.set(summary);
    this.errorMessage.set(null);
    this.form.reset({
      amount: 0,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      status: PaymentRecordStatus.CONFIRMED,
      reference: '',
      note: '',
    });
    this.visible.set(true);
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

    const { amount, paymentMethod, status, reference, note } = this.form.getRawValue();
    const body: RecordPaymentRequest = {
      amount: amount ?? 0,
      paymentMethod: paymentMethod ?? PaymentMethod.BANK_TRANSFER,
      status: status ?? PaymentRecordStatus.CONFIRMED,
      reference: reference || undefined,
      note: note || undefined,
      isCustomerInitiated: false,
    };

    this.loading.set(true);
    this.errorMessage.set(null);

    this.paymentsApi
      .recordPayment(this.saleId()!, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Payment Recorded',
            detail: `Payment of GHS ${record.amount.toFixed(2)} recorded successfully.`,
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
