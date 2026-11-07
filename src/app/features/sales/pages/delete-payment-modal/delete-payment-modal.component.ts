/**
 * Removing a payment that was recorded by mistake.
 *
 * Super admins only, and deliberately slow. Deleting a payment changes how
 * much a customer owes, can take a Paid sale back to Part Payment or Pending,
 * and leaves any receipt already sent for it describing money the books no
 * longer hold. So the dialog spells out exactly what will happen to this
 * sale, shows the payment being removed, and asks for an explicit
 * acknowledgement before the button does anything.
 *
 * A reason is asked for but not required: it is what lets whoever reconciles
 * the books later tell "entered twice" from something worth chasing, and it
 * is stored in the audit log beside a snapshot of the payment.
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
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';

// Local
import { SalesPaymentsApiService } from '../../services/sales-payments-api.service';
import { paymentErrorMessage } from '../../utils/payment-error-message';
import {
  InvoiceCurrency,
  PAYMENT_METHOD_LABELS,
  PaymentRecordStatus,
  SalePaymentRecord,
  SalePaymentSummary,
} from '../../models/sale.model';
import { formatSaleAmount } from '@shared/utils/sale-money';

/** Matches the API's limit, so the form refuses what the server would. */
export const DELETE_REASON_MAX_LENGTH = 500;

@Component({
  selector: 'app-delete-payment-modal',
  templateUrl: './delete-payment-modal.component.html',
  styleUrls: ['./delete-payment-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, CheckboxModule, TextareaModule],
})
export class DeletePaymentModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly paymentsApi = inject(SalesPaymentsApiService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted once the API has removed the payment; carries what was removed. */
  public readonly paymentDeleted = output<SalePaymentRecord>();

  // ─── State ──────────────────────────────────────────────────────────────────
  public readonly visible = signal(false);
  public readonly loading = signal(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly payment = signal<SalePaymentRecord | null>(null);
  private readonly saleId = signal<string | null>(null);
  private readonly summary = signal<SalePaymentSummary | null>(null);
  private readonly currency = signal<InvoiceCurrency | undefined>(undefined);

  public readonly reasonMaxLength = DELETE_REASON_MAX_LENGTH;

  // ─── Form ────────────────────────────────────────────────────────────────────
  public readonly form = this.fb.group({
    reason: ['', Validators.maxLength(DELETE_REASON_MAX_LENGTH)],
    acknowledged: [false, Validators.requiredTrue],
  });

  private readonly acknowledged = toSignal(this.form.controls.acknowledged.valueChanges, {
    initialValue: this.form.controls.acknowledged.value,
  });

  /** The delete button stays disabled until the warning is acknowledged. */
  public readonly canDelete = computed(() => !!this.acknowledged() && !this.loading());

  /**
   * Only a confirmed payment counts towards the balance, so only removing
   * one changes what the customer owes. Removing a pending or failed one is
   * housekeeping, and the warning says so rather than overstating it.
   */
  public readonly affectsBalance = computed(
    () => this.payment()?.status === PaymentRecordStatus.CONFIRMED,
  );

  /** What the customer will owe once this payment is gone. */
  public readonly balanceAfter = computed(() => {
    const summary = this.summary();
    const payment = this.payment();

    if (!summary || !payment) {
      return null;
    }

    const paidAfter = summary.totalPaid - (this.affectsBalance() ? Number(payment.amount) : 0);

    return Math.max(0, summary.saleTotal - paidAfter);
  });

  /** True when this deletion takes a fully paid sale back to owing money. */
  public readonly reopensSale = computed(
    () => !!this.summary()?.isFullyPaid && (this.balanceAfter() ?? 0) > 0,
  );

  /** An amount in the sale's own currency. */
  public money(amount: number): string {
    return formatSaleAmount(amount, { currency: this.currency() });
  }

  public methodLabel(payment: SalePaymentRecord): string {
    return PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod;
  }

  public open(
    saleId: string,
    payment: SalePaymentRecord,
    summary: SalePaymentSummary | null,
    currency?: InvoiceCurrency,
  ): void {
    this.saleId.set(saleId);
    this.payment.set(payment);
    this.summary.set(summary);
    this.currency.set(currency);
    this.errorMessage.set(null);
    this.form.reset({ reason: '', acknowledged: false });
    this.visible.set(true);
  }

  public close(): void {
    this.visible.set(false);
    this.form.reset({ reason: '', acknowledged: false });
    this.saleId.set(null);
    this.payment.set(null);
    this.summary.set(null);
    this.errorMessage.set(null);
  }

  public onConfirm(): void {
    const saleId = this.saleId();
    const payment = this.payment();

    if (this.form.invalid || !saleId || !payment) {
      this.form.markAllAsTouched();
      return;
    }

    const reason = this.form.controls.reason.value?.trim();

    this.loading.set(true);
    this.errorMessage.set(null);

    this.paymentsApi
      .deletePayment(saleId, payment.id, reason ? { reason } : {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (deleted) => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Payment deleted',
            detail: `${this.money(Number(payment.amount))} was removed from this sale.`,
          });
          this.paymentDeleted.emit(deleted);
          this.close();
        },
        error: (err: { status?: number }) => {
          this.loading.set(false);
          this.errorMessage.set(
            err.status === 403
              ? 'Only a super admin can delete a payment.'
              : paymentErrorMessage(err.status),
          );
        },
      });
  }
}
