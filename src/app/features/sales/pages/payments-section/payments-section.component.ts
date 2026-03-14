/**
 * Payments Section Component
 * Displays the full payment summary and all payment records for a sale.
 * Hosts the Add Payment and Update Payment Status modals.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

// Local
import { SalesPaymentsApiService } from '../../services/sales-payments-api.service';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_RECORD_STATUS_CONFIG,
  PaymentMethod,
  PaymentRecordStatus,
  SalePaymentRecord,
  SalePaymentSummary,
} from '../../models/sale.model';
import { AddPaymentModalComponent } from '../add-payment-modal/add-payment-modal.component';
import { UpdatePaymentStatusModalComponent } from '../update-payment-status-modal/update-payment-status-modal.component';

@Component({
  selector: 'app-payments-section',
  templateUrl: './payments-section.component.html',
  styleUrls: ['./payments-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TableModule,
    ButtonModule,
    TagModule,
    ProgressBarModule,
    SkeletonModule,
    TooltipModule,
    AddPaymentModalComponent,
    UpdatePaymentStatusModalComponent,
  ],
})
export class PaymentsSectionComponent implements OnInit {
  private readonly paymentsApi = inject(SalesPaymentsApiService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  /** The ID of the sale whose payments to display. */
  public readonly saleId = input.required<string>();

  // ─── Child modals ────────────────────────────────────────────────────────────
  private readonly addPaymentModal = viewChild.required(AddPaymentModalComponent);
  private readonly updateStatusModal = viewChild.required(UpdatePaymentStatusModalComponent);

  // ─── State ──────────────────────────────────────────────────────────────────
  public readonly loading = signal(false);
  public readonly loadError = signal<string | null>(null);
  public readonly summary = signal<SalePaymentSummary | null>(null);
  public readonly fullyPaidBanner = signal(false);

  // ─── Derived ────────────────────────────────────────────────────────────────
  public readonly payments = computed(() => this.summary()?.payments ?? []);
  public readonly totalPaid = computed(() => this.summary()?.totalPaid ?? 0);
  public readonly saleTotal = computed(() => this.summary()?.saleTotal ?? 0);
  public readonly balanceRemaining = computed(() => this.summary()?.balanceRemaining ?? 0);
  public readonly isFullyPaid = computed(() => this.summary()?.isFullyPaid ?? false);
  public readonly progressPercent = computed(() => {
    const total = this.saleTotal();
    if (total <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((this.totalPaid() / total) * 100));
  });

  public ngOnInit(): void {
    this.loadSummary();
  }

  /** Format amount as GHS currency string. */
  public formatGhs(amount: number): string {
    return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount);
  }

  /** Format ISO date string to human-readable. */
  public formatDate(iso: string): string {
    return new Intl.DateTimeFormat('en-GH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  }

  /** PrimeNG tag severity for a PaymentRecordStatus. */
  public getRecordStatusSeverity(
    status: PaymentRecordStatus,
  ): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case PaymentRecordStatus.CONFIRMED:
        return 'success';
      case PaymentRecordStatus.PENDING:
        return 'warn';
      case PaymentRecordStatus.FAILED:
        return 'danger';
      case PaymentRecordStatus.REFUNDED:
        return 'secondary';
    }
  }

  /** Label for a PaymentRecordStatus. */
  public getRecordStatusLabel(status: PaymentRecordStatus): string {
    return PAYMENT_RECORD_STATUS_CONFIG[status]?.label ?? status;
  }

  /** Label for a PaymentMethod. */
  public getMethodLabel(method: PaymentMethod): string {
    return PAYMENT_METHOD_LABELS[method] ?? method;
  }

  public onAddPayment(): void {
    this.addPaymentModal().open(this.saleId(), this.summary());
  }

  public onUpdateStatus(payment: SalePaymentRecord): void {
    this.updateStatusModal().open(this.saleId(), payment);
  }

  public onPaymentAdded(): void {
    this.loadSummary(true);
  }

  public onStatusUpdated(updated: SalePaymentRecord): void {
    // Optimistically replace the record in the local list, then re-fetch summary
    this.summary.update((s) => {
      if (!s) {
        return s;
      }
      return {
        ...s,
        payments: s.payments.map((p) => (p.id === updated.id ? updated : p)),
      };
    });
    this.loadSummary(false);
  }

  public retryLoad(): void {
    this.loadSummary();
  }

  private loadSummary(showFullyPaidBanner = false): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.paymentsApi
      .getPaymentSummary(this.saleId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.summary.set(s);
          this.loading.set(false);
          if (showFullyPaidBanner && s.isFullyPaid) {
            this.fullyPaidBanner.set(true);
            this.messageService.add({
              severity: 'success',
              summary: '🎉 Fully Paid',
              detail: 'Sale is now fully paid!',
              life: 6000,
            });
          }
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set('Failed to load payments. Please try again.');
        },
      });
  }
}
