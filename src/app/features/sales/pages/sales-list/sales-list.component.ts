/**
 * Sales List Page Component
 * Main page for displaying and managing sales with filters, pagination, and status transitions
 * Uses Angular signals for reactive state management
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// PrimeNG Imports
import { TableModule, TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmationService, MenuItem, MessageService, PrimeTemplate } from 'primeng/api';
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
import { InvoicePreviewModalComponent } from '../invoice-preview-modal/invoice-preview-modal.component';
import {
  getPaymentStatusSeverity,
  getStatusLabel,
  getStatusSeverity,
} from '@shared/utils/sales.utils';
import { Customer } from '@models/customer.model';
import { customerFullLabel } from '@shared/utils/customer-name';
import { AttentionChipKey, waitingLabel } from '../../utils/attention-chips';
import {
  ORDER_STATUS_FILTER_OPTIONS,
  PAYMENT_STATUS_FILTER_OPTIONS,
} from '../../constants/sale-status-options';
import { SalesAttentionStore } from '../../services/sales-attention.store';
import { isWeightPartial, orderWeightLabel, weightCaveat } from '../../utils/order-weight';
import { SalesMetricsPanelComponent } from '../sales-metrics-panel/sales-metrics-panel.component';

import { formatSaleAmount } from '@shared/utils/sale-money';
import { buildSaleActionMenu } from '../../utils/sale-action-menu';
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
    DialogModule,
    CheckboxModule,
    PrimeTemplate,
    TooltipModule,
    MenuModule,
    InputTextModule,
    ProgressBarModule,
    ButtonComponent,
    SelectComponent,
    InvoicePreviewModalComponent,
    ReceiptGenerationModalComponent,
    WaybillGenerationModalComponent,
    DeliveryCostUpdateModalComponent,
    CancelSaleByAdminModalComponent,
    SalesMetricsPanelComponent,
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
  public readonly attention = inject(SalesAttentionStore);

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
  /** Money in each sale's own currency, not an assumed cedi. */
  protected readonly money = formatSaleAmount;

  // ViewChild references
  public readonly invoicePreviewModal = viewChild.required(InvoicePreviewModalComponent);
  public readonly receiptModal = viewChild.required(ReceiptGenerationModalComponent);
  public readonly waybillModal = viewChild.required(WaybillGenerationModalComponent);
  public readonly deliveryCostModal = viewChild.required(DeliveryCostUpdateModalComponent);
  public readonly cancelModal = viewChild.required(CancelSaleByAdminModalComponent);

  // Lists live beside the form's, so a new status is added once.
  public readonly statusOptions = ORDER_STATUS_FILTER_OPTIONS;
  public readonly paymentStatusOptions = PAYMENT_STATUS_FILTER_OPTIONS;

  public statusFilterControl = new FormControl<OrderStatus | null>(null);
  public paymentStatusFilterControl = new FormControl<PaymentStatus | null>(null);
  public customerNameFilterControl = new FormControl<string>('');

  /** The page being requested. Every filter change resets it to the first. */
  private requestedPage = 1;
  /** Where the paginator widget should sit, so it follows a filter reset
      instead of still highlighting the page we have just left. */
  public readonly firstRow = computed(() => (this.page() - 1) * this.limit());

  public ngOnInit(): void {
    this.loadSales();
    this.attention.refresh();
    // Subscribe to status filter changes
    this.statusFilterControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onFilterChange());
    this.paymentStatusFilterControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onFilterChange());
    /* Typed rather than picked, so it waits for a pause — and ignores a
       re-emit of the same text, which a trailing debounce otherwise turns
       into a second identical request. */
    this.customerNameFilterControl.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(300),
        distinctUntilChanged(),
      )
      .subscribe(() => this.onFilterChange());
  }

  /**
   * Any filter changing re-runs the whole query from the first page.
   *
   * Every handler used to build a query out of its own value alone, so
   * setting a second filter silently dropped the first — which is why a
   * filter often looked broken until it was cleared and set again. The
   * controls are the only state now, and `loadSales` reads all of them.
   */
  public onFilterChange(): void {
    this.requestedPage = 1;
    this.loadSales();
  }

  public onPageChange(event: TablePageEvent): void {
    this.requestedPage = event.first / event.rows + 1;
    this.loadSales();
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

  /**
   * Whether the pending status change should be emailed to the customer.
   * Reset each time the dialog opens, so one deliberate tick never carries
   * over into the next sale.
   */
  public readonly notifyOnStatusChange = signal(false);

  public onUpdateStatus(sale: Sale, newStatus: OrderStatus): void {
    this.notifyOnStatusChange.set(false);

    this.confirmationService.confirm({
      message: `Are you sure you want to change the status to ${newStatus.replace('_', ' ')}?`,
      header: 'Confirm Status Change',
      icon: 'pi pi-exclamation-triangle',
      accept: () =>
        this.store.dispatch(
          updateSaleStatus({
            id: sale.id,
            orderStatus: newStatus,
            notifyCustomer: this.notifyOnStatusChange(),
          }),
        ),
    });
  }

  public onGenerateInvoice(sale: Sale): void {
    // Preview first: downloading or emailing is the admin's call, not a side
    // effect of asking to see the invoice.
    this.invoicePreviewModal().open(
      sale.id,
      sale.customer?.email,
      sale.invoiceCurrency,
      sale.invoiceExchangeRate,
    );
  }

  public onGenerateReceipt(sale: Sale): void {
    this.receiptModal().open(sale.id, sale.currency);
  }

  public onGenerateWaybill(sale: Sale): void {
    this.waybillModal().open(sale.id);
  }

  public onUpdateDeliveryCost(sale: Sale): void {
    this.deliveryCostModal().open(sale.id, sale.currency);
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
    this.menuItems.set(
      buildSaleActionMenu(sale, this.userRole(), {
        edit: (s) => this.onEditSale(s),
        toggleFlag: (s) => this.onToggleFlag(s),
        viewPayments: (s) => this.onViewPayments(s),
        generateInvoice: (s) => this.onGenerateInvoice(s),
        generateWaybill: (s) => this.onGenerateWaybill(s),
        generateReceipt: (s) => this.onGenerateReceipt(s),
        updateDeliveryCost: (s) => this.onUpdateDeliveryCost(s),
        cancel: (s) => this.onCancelSale(s),
        updateStatus: (s, status) => this.onUpdateStatus(s, status),
      }),
    );
  }

  /**
   * Builds the query from every filter currently set, never from one of them.
   *
   * A blank is sent as `undefined` rather than an empty value, so clearing a
   * filter actually drops it from the request instead of asking the API for
   * sales whose customer is named "".
   */
  private loadSales(): void {
    this.store.dispatch(
      loadSales({
        orderStatus: this.statusFilterControl.value ?? undefined,
        paymentStatus: this.paymentStatusFilterControl.value ?? undefined,
        customerName: this.customerNameFilterControl.value?.trim() || undefined,
        needsAttention: this.attention.isActive('needsAttention') || undefined,
        flagged: this.attention.isActive('flagged') || undefined,
        attention: this.attention.activeBucket() ?? undefined,
        page: this.requestedPage,
        limit: 10,
      }),
    );
  }

  protected readonly getPaymentStatusSeverity = getPaymentStatusSeverity;
  protected readonly getStatusLabel = getStatusLabel;
  protected readonly getStatusSeverity = getStatusSeverity;
  protected readonly waitingLabel = waitingLabel;
  protected readonly orderWeightLabel = orderWeightLabel;
  protected readonly isWeightPartial = isWeightPartial;
  protected readonly weightCaveat = weightCaveat;

  public onChipToggle(key: AttentionChipKey): void {
    this.attention.toggleChip(key);
    this.onFilterChange();
  }

  public onToggleFlag = (sale: Sale): void =>
    this.attention.toggleFlag(sale, () => this.loadSales());

  public getCustomerLabel(customer: Customer | undefined): string {
    return customer ? customerFullLabel(customer, 'N/A') : 'N/A';
  }
}
