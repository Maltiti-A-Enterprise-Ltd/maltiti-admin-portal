/**
 * Sales Form Page Component
 * Form for creating and editing sales with customer selection, line items, and batch management
 * Uses Angular reactive forms and signals for state management
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
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormArray,
  FormControl,
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  OrderStatus,
  PaymentStatus,
  Sale,
  SaleLineItemDto,
} from '../../models/sale.model';
import { createSale, updateSale } from '../../store/sales.actions';
import { selectError, selectLoading } from '../../store/sales.selectors';
import { ButtonComponent } from '@shared/components/button/button.component';
import { LineItemEditorComponent } from '../line-item-editor/line-item-editor.component';
import { CustomerCreationModalComponent } from '../customer-creation-modal/customer-creation-modal.component';
import { SelectComponent } from '@shared/components/select/select.component';
import { CustomerSelectComponent } from '@shared/components/customer-virtual-select/customer-select.component';
import { Customer } from '@models/customer.model';
import { ProductApiService } from '@features/products/services/product-api.service';
import { LightProduct } from '@features/products/models/product.model';
import { APP_ROUTES } from '@config/routes.config';
import { combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { saleFormTotals } from '../../utils/sale-form-totals';
import { lineItemSummarySignal } from '../../utils/line-item-summary';
import { orderWeightSignal } from '../../utils/order-weight';
import { deliveryAddressSignal } from '../../utils/delivery-address';
import {
  buildSaleCreatePayload,
  buildSaleUpdatePayload,
  isSaleLocked,
  saleEditLock,
} from '../../utils/sale-edit-lock';
import { selectUserRole } from '@auth/store/auth.selectors';
import { selectCustomers } from '../../store/customers.selectors';
import { ORDER_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from '../../constants/sale-status-options';
import { BatchApiService } from '../../../batches/services/batch-api.service';
import { Batch } from '../../../batches/models/batch.model';
import { CurrencyRateState } from '../../services/currency-rate.state';
@Component({
  selector: 'app-sales-form',
  standalone: true,
  templateUrl: './sales-form.component.html',
  styleUrls: ['./sales-form.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    SelectModule,
    TooltipModule,
    CardModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    DialogModule,
    ConfirmDialogModule,
    ButtonComponent,
    LineItemEditorComponent,
    CustomerCreationModalComponent,
    SelectComponent,
    CustomerSelectComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, CurrencyRateState],
})
export class SalesFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly productApiService = inject(ProductApiService);
  private readonly batchApiService = inject(BatchApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly customerModal =
    viewChild.required<CustomerCreationModalComponent>('customerModal');

  // Signals
  public readonly loading = this.store.selectSignal(selectLoading);
  public readonly error = this.store.selectSignal(selectError);
  /* The deal currency, pinned when the sale is created. Shared with the
     invoice dialog, which uses the same picker for a different purpose. */
  public readonly deal = inject(CurrencyRateState);
  public readonly products = signal<LightProduct[]>([]);
  public readonly batchesByProductId = signal<Map<string, Batch[]>>(new Map());
  public readonly confirmDeliveryDate = signal<string | null>(null);
  public readonly lineItemValidationErrors = signal<Map<number, boolean>>(new Map());
  public readonly hasLineItemErrors = signal<boolean>(false);
  // Form
  public salesForm = this.fb.group({
    line_items: this.fb.array<SaleLineItemDto>([], Validators.minLength(1)),
    deliveryFee: [0, [Validators.required, Validators.min(0)]],
  });
  private readonly fee = this.salesForm.controls.deliveryFee;
  private readonly totals = saleFormTotals(this.lineItems, this.fee);
  public readonly totalPrice = this.totals.total;
  /** Just the premiums, so the total can say how much of it they are. */
  public readonly premiumTotal = this.totals.premium;
  public customerControl = new FormControl<string>('', Validators.required);
  public statusControl = new FormControl(OrderStatus.PENDING, Validators.required);
  public paymentStatusControl = new FormControl<PaymentStatus>(
    PaymentStatus.INVOICE_REQUESTED,
    Validators.required,
  );
  public readonly isPaid = computed(() => this.paymentStatusControl.value === PaymentStatus.PAID);
  /**
   * Opt-in notification. Describes the save rather than the sale, so it lives
   * outside the form group and is never seeded from a loaded sale.
   */
  public readonly notifyCustomerControl = new FormControl(false);
  public isEditMode = false;
  public saleId: string | null = null;

  // Status options
  public readonly statusOptions = ORDER_STATUS_OPTIONS;
  public readonly paymentStatusOptions = PAYMENT_STATUS_OPTIONS;

  /** Running count of what has been added, so the total is never a surprise. */
  public readonly lineItemSummary = lineItemSummarySignal(this.lineItems);

  /** Dispatched sales are frozen apart from their status. */
  public readonly lock = saleEditLock(this.store.selectSignal(selectUserRole), [
    this.salesForm.controls.line_items,
    this.salesForm.controls.deliveryFee,
    this.customerControl,
  ]);

  /** What the sale weighs, recalculated as line items change. */
  public readonly orderWeight = orderWeightSignal(this.lineItems, this.products);

  /** Where the goods go, following the dropdown rather than the saved sale. */
  public readonly deliveryAddress = deliveryAddressSignal(
    this.customerControl,
    this.store.selectSignal(selectCustomers),
  );

  public ngOnInit(): void {
    this.checkEditMode();
    this.loadProducts();
  }

  private loadProducts(): void {
    this.productApiService
      .getAllProductsSimple()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.products.set(response.data);
          this.loadBatches();
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load products. Please refresh the page.',
          }),
      });
  }

  private loadBatches(): void {
    const productIds = this.products().map((p) => p.id);
    if (productIds.length === 0) {
      return;
    }
    this.batchApiService
      .getBatchesByProductIds(productIds)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const batchesMap = new Map<string, Batch[]>();
          response.data.forEach((batch) => {
            const productId = batch.product?.id;
            if (!productId) {
              return;
            }
            batchesMap.set(productId, [...(batchesMap.get(productId) ?? []), batch]);
          });
          this.batchesByProductId.set(batchesMap);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load batches. Please refresh the page.',
          });
        },
      });
  }

  private checkEditMode(): void {
    this.saleId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.saleId;

    if (this.isEditMode && this.saleId) {
      // Sale data is already loaded by the resolver
      // Access it from route data if needed
      const resolvedSale = this.route.snapshot.data['sale'];
      if (resolvedSale) {
        this.populateForm(resolvedSale);
      }
    }
  }

  private populateForm(sale: Sale): void {
    // Pinned, not editable — but every price on the page is labelled with it.
    this.deal.reset(sale.currency, sale.exchangeRate);
    this.lock.isLocked.set(isSaleLocked(sale));
    this.customerControl.setValue(sale.customer?.id || sale.customerId);

    this.statusControl.setValue(sale.orderStatus);
    this.paymentStatusControl.setValue(sale.paymentStatus);

    this.salesForm.controls.deliveryFee.setValue(sale.deliveryFee);

    this.confirmDeliveryDate.set(sale.confirmedDeliveryDate || null);

    this.lineItems.clear();
    this.lineItems.push(
      sale.lineItems.map((item) =>
        this.fb.control<SaleLineItemDto>({
          productId: item.productId,
          requestedQuantity: item.requestedQuantity,
          batchAllocations: item.batchAllocations || [],
          customPrice: item.customPrice,
          finalPrice: Number(item.finalPrice),
        }),
      ),
    );
  }

  public get lineItems(): FormArray<FormControl<SaleLineItemDto>> {
    return this.salesForm.controls.line_items;
  }

  public addLineItem(): void {
    const newLineItem: SaleLineItemDto = {
      productId: '',
      requestedQuantity: 1,
      batchAllocations: [],
    };
    this.lineItems.insert(0, this.fb.control(newLineItem));
  }

  public removeLineItem(index: number): void {
    this.lineItems.removeAt(index);

    // Clear validation error for removed line item
    const errors = this.lineItemValidationErrors();
    errors.delete(index);

    // Re-index remaining errors
    const reIndexedErrors = new Map<number, boolean>();
    errors.forEach((value, key) => {
      if (key > index) {
        reIndexedErrors.set(key - 1, value);
      } else {
        reIndexedErrors.set(key, value);
      }
    });

    this.lineItemValidationErrors.set(reIndexedErrors);

    // Check if any line item has errors
    const hasAnyError = Array.from(reIndexedErrors.values()).some(Boolean);
    this.hasLineItemErrors.set(hasAnyError);
  }

  public onLineItemChange(index: number, lineItem: SaleLineItemDto): void {
    this.lineItems.at(index).setValue({
      ...lineItem,
    });
  }

  public onLineItemValidationError(index: number, hasError: boolean): void {
    const errors = this.lineItemValidationErrors();
    errors.set(index, hasError);
    this.lineItemValidationErrors.set(new Map(errors));

    // Check if any line item has errors
    const hasAnyError = Array.from(errors.values()).some(Boolean);
    this.hasLineItemErrors.set(hasAnyError);
  }

  public onSubmit(): void {
    // Check for line item validation errors first
    if (this.hasLineItemErrors()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail:
          'One or more line items are incomplete or have batch allocation errors. Please fix them before submitting.',
      });
      return;
    }

    if (
      this.salesForm.valid &&
      this.customerControl.valid &&
      this.statusControl.valid &&
      this.paymentStatusControl.valid
    ) {
      const formValue = this.salesForm.value;
      const common = {
        customerId: String(this.customerControl.value),
        orderStatus: this.statusControl.value as OrderStatus,
        paymentStatus: this.paymentStatusControl.value as PaymentStatus,
        deliveryFee: Number(this.salesForm.value.deliveryFee ?? 0),
        lineItems: formValue.line_items as SaleLineItemDto[],
        notifyCustomer: !!this.notifyCustomerControl.value,
      };

      if (this.isEditMode && this.saleId) {
        const updateData = buildSaleUpdatePayload({
          ...common,
          canEditContents: this.lock.canEditContents(),
          overriding: this.lock.isOverriding(),
        });

        this.store.dispatch(updateSale({ id: this.saleId, saleData: updateData }));
      } else {
        /* The deal currency is only settable at creation — it is pinned with
           its rate and every amount on the sale is denominated in it. */
        const saleData = buildSaleCreatePayload({
          ...common,
          currency: this.deal.currency(),
          exchangeRate: this.deal.exchangeRate() ?? undefined,
        });

        this.store.dispatch(createSale({ saleData }));
      }
    } else {
      this.salesForm.markAllAsTouched();
      this.customerControl.markAsTouched();
      this.statusControl.markAsTouched();
      this.paymentStatusControl.markAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill in all required fields',
      });
    }
  }

  public onCancel(): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to cancel? All unsaved changes will be lost.',
      header: 'Confirm Cancel',
      icon: 'pi pi-exclamation-triangle',
      accept: () => void this.router.navigate([APP_ROUTES.sales.list.fullPath]),
    });
  }

  public openCustomerDialog(): void {
    this.customerModal().open();
  }

  public onCustomerSelected(customer: Customer): void {
    this.customerControl.setValue(customer.id);
  }
}
