/**
 * Sales List Page Component
 * Main page for displaying and managing sales with filters, pagination, and status transitions
 * Uses Angular signals for reactive state management
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { first } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

// PrimeNG Imports
import { TableModule, TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';

// Local imports
import { Store } from '@ngrx/store';
import { OrderStatus, PaymentStatus, Sale } from '../../models/sale.model';
import { loadSales, updateSaleStatus } from '../../store/sales.actions';
import {
  selectError,
  selectLimit,
  selectLoading,
  selectPage,
  selectSales,
  selectTotal,
  selectTotalPages,
} from '../../store/sales.selectors';
import { selectUserRole } from '@auth/store/auth.selectors';
import { ButtonComponent } from '@shared/components/button/button.component';
import { SelectComponent } from '@shared/components/select/select.component';
import { lineItemsTotalPrice } from '@shared/utils/totalPriceCalculator';
import { APP_ROUTES } from '@config/routes.config';
import { SalesApiService } from '../../services/sales-api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReceiptGenerationModalComponent } from '../receipt-generation-modal/receipt-generation-modal.component';
import { WaybillGenerationModalComponent } from '../waybill-generation-modal/waybill-generation-modal.component';
import { DeliveryCostUpdateModalComponent } from '../delivery-cost-update-modal/delivery-cost-update-modal.component';
import { CancelSaleByAdminModalComponent } from '../cancel-sale-by-admin-modal/cancel-sale-by-admin-modal.component';
import { Role } from '@models/user.model';
import {
  getNextStatuses,
  getPaymentStatusSeverity,
  getStatusLabel,
  getStatusSeverity,
} from '@shared/utils/sales.utils';

@Component({
  selector: 'app-sales-list',
  standalone: true,
  templateUrl: './sales-list.component.html',
  styleUrls: ['./sales-list.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    ConfirmDialogModule,
    TooltipModule,
    MenuModule,
    InputTextModule,
    ProgressBarModule,
    DecimalPipe,
    ButtonComponent,
    SelectComponent,
    ReceiptGenerationModalComponent,
    WaybillGenerationModalComponent,
    DeliveryCostUpdateModalComponent,
    CancelSaleByAdminModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
})
export class SalesListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly salesApiService = inject(SalesApiService);
  private readonly messageService = inject(MessageService);

  // Signals from store
  public readonly sales = this.store.selectSignal(selectSales);
  public readonly loading = this.store.selectSignal(selectLoading);
  public readonly error = this.store.selectSignal(selectError);
  public readonly total = this.store.selectSignal(selectTotal);
  public readonly page = this.store.selectSignal(selectPage);
  public readonly limit = this.store.selectSignal(selectLimit);
  public readonly totalPages = this.store.selectSignal(selectTotalPages);
  public readonly userRole = this.store.selectSignal(selectUserRole);
  public readonly menuItems = signal<MenuItem[]>([]);

  protected readonly lineItemsTotalPrice = lineItemsTotalPrice;

  // ViewChild references
  public readonly receiptModal = viewChild.required(ReceiptGenerationModalComponent);
  public readonly waybillModal = viewChild.required(WaybillGenerationModalComponent);
  public readonly deliveryCostModal = viewChild.required(DeliveryCostUpdateModalComponent);
  public readonly cancelModal = viewChild.required(CancelSaleByAdminModalComponent);

  // Local state
  public readonly statusOptions = [
    { label: 'All Statuses', value: null },
    { label: 'Pending', value: OrderStatus.PENDING },
    { label: 'Packaging', value: OrderStatus.PACKAGING },
    { label: 'In Transit', value: OrderStatus.IN_TRANSIT },
    { label: 'Delivered', value: OrderStatus.DELIVERED },
    { label: 'Cancelled', value: OrderStatus.CANCELLED },
  ];

  public readonly paymentStatusOptions = [
    { label: 'All Payment Statuses', value: null },
    { label: 'Invoice Requested', value: PaymentStatus.INVOICE_REQUESTED },
    { label: 'Pending Payment', value: PaymentStatus.PENDING_PAYMENT },
    { label: 'Paid', value: PaymentStatus.PAID },
    { label: 'Refunded', value: PaymentStatus.REFUNDED },
    { label: 'Awaiting Delivery', value: PaymentStatus.AWAITING_DELIVERY },
  ];

  public statusFilterControl = new FormControl<OrderStatus | null>(null);
  public paymentStatusFilterControl = new FormControl<PaymentStatus | null>(null);
  public customerNameFilterControl = new FormControl<string>('');

  public selectedStatus: OrderStatus | null = null;
  public selectedPaymentStatus: PaymentStatus | null = null;

  public ngOnInit(): void {
    this.loadSales();
    // Subscribe to status filter changes
    this.statusFilterControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => {
        this.onOrderStatusFilterChange(status);
      });
    this.paymentStatusFilterControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => {
        this.onPaymentStatusFilterChange(status);
      });
    this.customerNameFilterControl.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(300), // Add debounce time here
      )
      .subscribe((name) => {
        this.onCustomerNameFilterChange(name);
      });
  }

  public onOrderStatusFilterChange(status: OrderStatus | null): void {
    this.selectedStatus = status;
    this.loadSales({ orderStatus: status ?? undefined, page: 1 });
  }

  public onPaymentStatusFilterChange(status: PaymentStatus | null): void {
    this.selectedPaymentStatus = status;
    this.loadSales({ paymentStatus: status ?? undefined, page: 1 });
  }

  public onCustomerNameFilterChange(name: string | null): void {
    this.loadSales({ customerName: name ?? undefined, page: 1 });
  }

  public onPageChange(event: TablePageEvent): void {
    const page = event.first / event.rows + 1;
    this.loadSales({
      orderStatus: this.selectedStatus ?? undefined,
      paymentStatus: this.selectedPaymentStatus ?? undefined,
      page,
    });
  }

  public onCreateSale(): void {
    void this.router.navigate([APP_ROUTES.sales.create.fullPath]);
  }

  public onEditSale(sale: Sale): void {
    void this.router.navigate([APP_ROUTES.sales.edit(sale.id)]);
  }

  public onViewPayments(sale: Sale): void {
    void this.router.navigate([APP_ROUTES.sales.payments(sale.id)]);
  }

  public onUpdateStatus(sale: Sale, newStatus: OrderStatus): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to change the status to ${newStatus.replace('_', ' ')}?`,
      header: 'Confirm Status Change',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.store.dispatch(updateSaleStatus({ id: sale.id, orderStatus: newStatus })),
    });
  }

  public onGenerateInvoice(sale: Sale): void {
    this.salesApiService
      .generateInvoice(sale.id, { discount: 0, transportation: 0 })
      .pipe(first())
      .subscribe({
        next: (blob: Blob) => {
          // Create a download link for the PDF
          const url = globalThis.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `invoice-${sale.id}.pdf`;
          link.click();
          globalThis.URL.revokeObjectURL(url);

          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Invoice generated successfully',
          });
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to generate invoice',
          }),
      });
  }

  public onGenerateReceipt(sale: Sale): void {
    this.receiptModal().open(sale.id);
  }

  public onGenerateWaybill(sale: Sale): void {
    this.waybillModal().open(sale.id);
  }

  public onUpdateDeliveryCost(sale: Sale): void {
    this.deliveryCostModal().open(sale.id);
  }

  public onCancelSale(sale: Sale): void {
    this.cancelModal().open(sale.id);
  }

  public onSaleCancelled(): void {
    this.loadSales();
  }

  public onDeliveryCostUpdated(): void {
    this.loadSales();
  }

  public getPaymentProgress(sale: Sale): number {
    const totalPaid = sale.totalPaid;
    if (!sale.total || sale.total <= 0 || !totalPaid) {
      return 0;
    }
    return Math.min(100, Math.round((totalPaid / sale.total) * 100));
  }

  public getActionMenuItems(sale: Sale): void {
    // Check if user is admin and sale is not cancelled
    const isAdmin = this.userRole() === Role.Admin || this.userRole() === Role.SuperAdmin;
    const canCancel = isAdmin && sale.orderStatus !== OrderStatus.CANCELLED;

    // Add status change options
    const nextStatuses = getNextStatuses(sale.orderStatus);
    const statusItems: MenuItem[] =
      nextStatuses.length > 0
        ? [
            { separator: true },
            {
              label: 'Change Status',
              icon: 'pi pi-refresh',
              items: nextStatuses.map((status) => ({
                label: getStatusLabel(status),
                command: (): void => this.onUpdateStatus(sale, status),
              })),
            },
          ]
        : [];

    const actionItems: MenuItem[] = [
      {
        label: 'View / Edit Sale',
        icon: 'pi pi-pencil',
        command: (): void => this.onEditSale(sale),
      },
      {
        label: 'View Payments',
        icon: 'pi pi-credit-card',
        command: (): void => this.onViewPayments(sale),
      },
      {
        label: 'Generate Invoice',
        icon: 'pi pi-file-pdf',
        command: (): void => this.onGenerateInvoice(sale),
      },
      {
        label: 'Generate Waybill',
        icon: 'pi pi-truck',
        command: (): void => this.onGenerateWaybill(sale),
      },
      ...(sale.paymentStatus === PaymentStatus.PAID
        ? [
            {
              label: 'Generate Receipt',
              icon: 'pi pi-receipt',
              command: (): void => this.onGenerateReceipt(sale),
            },
          ]
        : []),
      ...(sale.paymentStatus === PaymentStatus.AWAITING_DELIVERY
        ? [
            {
              label: 'Update Delivery Cost',
              icon: 'pi pi-dollar',
              command: (): void => this.onUpdateDeliveryCost(sale),
            },
          ]
        : []),
      ...(canCancel
        ? [
            {
              separator: true,
            },
            {
              label: 'Cancel Order',
              icon: 'pi pi-times',
              command: (): void => this.onCancelSale(sale),
            },
          ]
        : []),
    ];

    const menuItems: MenuItem[] = [
      {
        label: 'Actions',
        items: actionItems,
      },
      ...statusItems,
    ];
    this.menuItems.set(menuItems);
  }

  private loadSales(params?: {
    orderStatus?: OrderStatus;
    paymentStatus?: PaymentStatus;
    customerName?: string;
    page?: number;
  }): void {
    this.store.dispatch(
      loadSales({
        orderStatus: params?.orderStatus ?? this.selectedStatus ?? undefined,
        paymentStatus: params?.paymentStatus ?? this.selectedPaymentStatus ?? undefined,
        customerName: params?.customerName ?? undefined,
        page: params?.page ?? 1,
        limit: 10,
      }),
    );
  }

  protected readonly getPaymentStatusSeverity = getPaymentStatusSeverity;
  protected readonly getStatusLabel = getStatusLabel;
  protected readonly getStatusSeverity = getStatusSeverity;
}
