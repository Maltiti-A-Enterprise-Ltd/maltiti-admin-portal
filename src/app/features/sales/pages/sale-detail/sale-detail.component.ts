/**
 * Sale Detail Page Component
 * Read-only view of a sale's information and its full payment history.
 * Separated from the Sales Form (edit) so payments are a standalone feature.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';

// PrimeNG
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DividerModule } from 'primeng/divider';

// Local
import { OrderStatus, PaymentStatus, Sale } from '../../models/sale.model';
import { PaymentsSectionComponent } from '../payments-section/payments-section.component';
import { APP_ROUTES } from '@config/routes.config';

@Component({
  selector: 'app-sale-detail',
  templateUrl: './sale-detail.component.html',
  styleUrls: ['./sale-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    CurrencyPipe,
    DecimalPipe,
    CardModule,
    TagModule,
    ButtonModule,
    SkeletonModule,
    DividerModule,
    PaymentsSectionComponent,
  ],
})
export class SaleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  public readonly sale = signal<Sale | null>(null);
  public readonly saleId = signal<string | null>(null);

  public readonly customerName = computed(() => {
    const s = this.sale();
    return s?.customer?.name ?? s?.customerId ?? '—';
  });

  public ngOnInit(): void {
    this.saleId.set(this.route.snapshot.paramMap.get('id'));
    const resolved = this.route.snapshot.data['sale'] as Sale | null;
    this.sale.set(resolved);
  }

  public onBack(): void {
    void this.router.navigate([APP_ROUTES.sales.list.fullPath]);
  }

  public onEdit(): void {
    const id = this.saleId();
    if (id) {
      void this.router.navigate([APP_ROUTES.sales.edit(id)]);
    }
  }

  public getOrderStatusSeverity(
    status: OrderStatus,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case OrderStatus.DELIVERED:
        return 'success';
      case OrderStatus.IN_TRANSIT:
      case OrderStatus.PACKAGING:
        return 'info';
      case OrderStatus.PENDING:
        return 'warn';
      case OrderStatus.CANCELLED:
        return 'danger';
      default:
        return 'secondary';
    }
  }

  public getPaymentStatusSeverity(
    status: PaymentStatus,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case PaymentStatus.PAID:
        return 'success';
      case PaymentStatus.PENDING_PAYMENT:
        return 'warn';
      case PaymentStatus.INVOICE_REQUESTED:
        return 'danger';
      case PaymentStatus.REFUNDED:
        return 'info';
      case PaymentStatus.AWAITING_DELIVERY:
        return 'info';
      default:
        return 'secondary';
    }
  }

  public formatStatus(status: string): string {
    return status.replaceAll('_', ' ').replaceAll(/\b\w/g, (l) => l.toUpperCase());
  }
}
