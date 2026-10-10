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
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  CreateSaleDto,
  OrderStatus,
  PaymentStatus,
  Sale,
  SaleLineItemDto,
  UpdateSaleDto,
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
import { lineItemsTotalPrice } from '@shared/utils/totalPriceCalculator';
import { lineItemSummarySignal } from '../../utils/line-item-summary';
import { toLineItemPayload } from '../../utils/sale-line-items';
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
} from '../../constants/sale-status-options';
import { BatchApiService } from '../../../batches/services/batch-api.service';
import { Batch } from '../../../batches/models/batch.model';

@Component({
  selector: 'app-sales-form',
  standalone: true,
  templateUrl: './sales-form.component.html',
  styleUrls: ['./sales-form.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
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
  providers: [ConfirmationService],
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
  public readonly totalPrice = toSignal(
    combineLatest([
      this.lineItems.valueChanges.pipe(startWith(this.lineItems.value)),
      this.salesForm.controls.deliveryFee.valueChanges.pipe(
        startWith(this.salesForm.controls.deliveryFee.value),
      ),
    ]).pipe(map(([items, deliveryFee]) => Number(deliveryFee) + lineItemsTotalPrice(items))),
    { initialValue: 0 },
  );
  public customerControl = new FormControl<string>('', Validators.required);
  public statusControl = new FormControl(OrderStatus.PENDING, Validators.required);
  public paymentStatusControl = new FormControl<PaymentStatus>(
    PaymentStatus.INVOICE_REQUESTED,
    Validators.required,
  );
  public readonly isPaid = computed(() => this.paymentStatusControl.value === PaymentStatus.PAID);

  /**
   * The API only accepts a delivery fee while the sale is awaiting delivery.
   * The form used to drop the field silently outside that state, so an edit
   * saved, reported success and changed nothing. Locking it shows the same
   * rule before the value is typed rather than after it vanishes.
   */
  public readonly canEditDeliveryFee = computed(
    () =>
      !this.isEditMode ||
      this.paymentStatusControl.value === PaymentStatus.AWAITING_DELIVERY,
  );
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

  public ngOnInit(): void {
    this.checkEditMode();
    this.loadProducts();
  }

  public get isBatchRequired(): boolean {
    const v = this.statusControl.value;
    return v
      ? [OrderStatus.PACKAGING, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED].includes(v)
      : false;
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
            if (productId) {
              if (!batchesMap.has(productId)) {
                batchesMap.set(productId, []);
              }
              batchesMap.get(productId)!.push(batch);
            }
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
    // Set customer
    this.customerControl.setValue(sale.customer?.id || sale.customerId);

    // Set status
    this.statusControl.setValue(sale.orderStatus);
    this.paymentStatusControl.setValue(sale.paymentStatus);

    // Set delivery fee
    this.salesForm.controls.deliveryFee.setValue(sale.deliveryFee);

    this.confirmDeliveryDate.set(sale.confirmedDeliveryDate || null);

    // Clear existing line items
    this.lineItems.clear();

    // Populate line items
    const lineItemsToAdd: FormControl<SaleLineItemDto>[] = [];
    sale.lineItems.forEach((item) => {
      const lineItemDto: SaleLineItemDto = {
        productId: item.productId,
        requestedQuantity: item.requestedQuantity,
        batchAllocations: item.batchAllocations || [],
        customPrice: item.customPrice,
        finalPrice: Number(item.finalPrice),
      };
      lineItemsToAdd.push(this.fb.control(lineItemDto));
    });
    this.lineItems.push(lineItemsToAdd);
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
      const lineItems = formValue.line_items as SaleLineItemDto[];
      if (this.isEditMode && this.saleId) {
        const paymentStatus = this.paymentStatusControl.value as PaymentStatus;
        // Handle update
        const updateData: UpdateSaleDto = {
          customerId: String(this.customerControl.value),
          orderStatus: this.statusControl.value as OrderStatus,
          paymentStatus,
          // Omitted only when the field was locked, so the value cannot have
          // been edited — rather than dropping an edit the user just made.
          deliveryFee: this.canEditDeliveryFee()
            ? this.salesForm.value.deliveryFee
            : undefined,
          lineItems: toLineItemPayload(lineItems),
        };

        this.store.dispatch(updateSale({ id: this.saleId, saleData: updateData }));
      } else {
        // Handle create
        const saleData: CreateSaleDto = {
          customerId: String(this.customerControl.value),
          orderStatus: this.statusControl.value as OrderStatus,
          paymentStatus: this.paymentStatusControl.value as PaymentStatus,
          deliveryFee: this.salesForm.value.deliveryFee,
          lineItems: toLineItemPayload(lineItems),
          // Create-only, and omitted when off: the API rejects unknown
          // properties, so an older deployment must not see the key at all.
          notifyCustomer: this.notifyCustomerControl.value || undefined,
        };

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
