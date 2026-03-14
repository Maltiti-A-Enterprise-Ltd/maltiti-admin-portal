/**
 * Update Payment Status Modal Component
 * Mini modal dialog allowing admins to change the status of an existing payment record.
 */

import {
  ChangeDetectionStrategy,
  Component,
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
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';

// Local
import { SalesPaymentsApiService } from '../../services/sales-payments-api.service';
import {
  PaymentRecordStatus,
  SalePaymentRecord,
  UpdatePaymentStatusRequest,
} from '../../models/sale.model';

interface StatusOption {
  label: string;
  value: PaymentRecordStatus;
}

@Component({
  selector: 'app-update-payment-status-modal',
  templateUrl: './update-payment-status-modal.component.html',
  styleUrls: ['./update-payment-status-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, SelectModule, TextareaModule],
})
export class UpdatePaymentStatusModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly paymentsApi = inject(SalesPaymentsApiService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted after status is successfully updated; carries the updated record. */
  public readonly statusUpdated = output<SalePaymentRecord>();

  // ─── State ──────────────────────────────────────────────────────────────────
  public readonly visible = signal(false);
  public readonly loading = signal(false);
  public readonly errorMessage = signal<string | null>(null);
  private readonly saleId = signal<string | null>(null);
  private readonly paymentId = signal<string | null>(null);

  // ─── Form ────────────────────────────────────────────────────────────────────
  public readonly form = this.fb.group({
    status: [PaymentRecordStatus.CONFIRMED, Validators.required],
    note: [''],
  });

  public readonly statusOptions: StatusOption[] = [
    { label: 'Confirmed', value: PaymentRecordStatus.CONFIRMED },
    { label: 'Pending', value: PaymentRecordStatus.PENDING },
    { label: 'Failed', value: PaymentRecordStatus.FAILED },
    { label: 'Refunded', value: PaymentRecordStatus.REFUNDED },
  ];

  /**
   * Open the modal pre-populated with the current payment status.
   */
  public open(saleId: string, payment: SalePaymentRecord): void {
    this.saleId.set(saleId);
    this.paymentId.set(payment.id);
    this.errorMessage.set(null);
    this.form.reset({ status: payment.status, note: '' });
    this.visible.set(true);
  }

  public close(): void {
    this.visible.set(false);
    this.form.reset();
    this.saleId.set(null);
    this.paymentId.set(null);
    this.errorMessage.set(null);
  }

  public onSubmit(): void {
    if (this.form.invalid || !this.saleId() || !this.paymentId()) {
      this.form.markAllAsTouched();
      return;
    }

    const { status, note } = this.form.getRawValue();
    const body: UpdatePaymentStatusRequest = {
      status: status ?? PaymentRecordStatus.CONFIRMED,
      note: note || undefined,
    };

    this.loading.set(true);
    this.errorMessage.set(null);

    this.paymentsApi
      .updatePaymentStatus(this.saleId()!, this.paymentId()!, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Status Updated',
            detail: 'Payment status updated successfully.',
          });
          this.statusUpdated.emit(record);
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
