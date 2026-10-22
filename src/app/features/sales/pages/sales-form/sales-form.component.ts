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
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { saleFormTotals } from '../../utils/sale-form-totals';
import { DatePickerModule } from 'primeng/datepicker';
import { saleFormCatalogue } from '../../utils/sale-form-catalogue';
import { arrivalDateForApi } from '../../utils/arrival-date';
import {
  PaymentTerms,
  PaymentTermsEditorComponent,
} from '../payment-terms-editor/payment-terms-editor.component';
import { lineItemSummarySignal } from '../../utils/line-item-summary';
import { orderWeightSignal } from '../../utils/order-weight';
import { deliveryAddressSignal } from '../../utils/delivery-address';
import {
  buildSaleCreatePayload,
  buildSaleUpdatePayload,
  saleEditLock,
  UpdatePayloadInput,
} from '../../utils/sale-edit-lock';
import { seedSaleForm } from '../../utils/sale-form-seed';
import { selectUserRole } from '@auth/store/auth.selectors';
import { selectCustomers } from '../../store/customers.selectors';
import { ORDER_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from '../../constants/sale-status-options';
import { CurrencyRateState } from '../../services/currency-rate.state';
import { reindexControlMap } from '../../utils/reindex-control-map';
import { SaleSettlementPanelComponent } from '../sale-settlement-panel/sale-settlement-panel.component';
@Component({
  selector: 'app-sales-form',
  standalone: true,
  templateUrl: './sales-form.component.html',
  styleUrls: ['./sales-form.component.scss'],
  imports: [
    DatePickerModule,
    PaymentTermsEditorComponent,
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
    SaleSettlementPanelComponent,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly customerModal =
    viewChild.required<CustomerCreationModalComponent>('customerModal');

  // Signals
  public readonly loading = this.store.selectSignal(selectLoading);
  public readonly error = this.store.selectSignal(selectError);
  /* The deal currency, pinned when the sale is created. Shared with the
     invoice dialog, which uses the same picker for a different purpose. */
  public readonly deal = inject(CurrencyRateState);
  private readonly catalogue = saleFormCatalogue();
  public readonly products = this.catalogue.products;
  public readonly batchesByProductId = this.catalogue.batchesByProductId;
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
  /* Owned by the editor below, which has its own rules about them. Null
     until the admin names any, which is the great majority of sales. */
  public readonly paymentTerms = signal<PaymentTerms | null>(null);
  /* Only meaningful once an order is on its way, so the field appears
     with that status rather than sitting empty on every sale. */
  public readonly arrivalDateControl = new FormControl<Date | null>(null);
  public readonly showArrivalDate = computed(
    () => this.orderStatusValue() === OrderStatus.IN_TRANSIT,
  );
  public readonly termsEditor = viewChild(PaymentTermsEditorComponent);
  public customerControl = new FormControl<string>('', Validators.required);
  public statusControl = new FormControl(OrderStatus.PENDING, Validators.required);
  /* Mirrors the control so `showArrivalDate` can be a computed — the
     field has to appear the moment the status is switched to in transit,
     which is when an admin is thinking about the date. */
  private readonly orderStatusValue = toSignal(this.statusControl.valueChanges, {
    initialValue: this.statusControl.value,
  });
  public paymentStatusControl = new FormControl<PaymentStatus>(
    PaymentStatus.INVOICE_REQUESTED,
    Validators.required,
  );
  /* Mirrors the control, the same way `orderStatusValue` does. A computed
     reading `paymentStatusControl.value` straight off never re-evaluates —
     a form control is not a signal — so the paid-sale lock, and the
     settlement panel below it, would both be stuck on whatever the status
     was when the page opened. */
  public readonly paymentStatusValue = toSignal(this.paymentStatusControl.valueChanges, {
    initialValue: this.paymentStatusControl.value,
  });
  public readonly isPaid = computed(() => this.paymentStatusValue() === PaymentStatus.PAID);
  /** Offers to record the money behind a status that claims it has arrived. */
  private readonly settlementPanel = viewChild(SaleSettlementPanelComponent);
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
  }

  private checkEditMode(): void {
    this.saleId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.saleId;

    // Already loaded by the resolver, so there is nothing to fetch here.
    const resolved = this.route.snapshot.data['sale'] as Sale | undefined;

    if (this.isEditMode && resolved) {
      this.populateForm(resolved);
    }
  }

  /** Every control the form opens with is written in `seedSaleForm`. */
  private populateForm(sale: Sale): void {
    seedSaleForm(sale, {
      deal: this.deal,
      isLocked: this.lock.isLocked,
      customer: this.customerControl,
      orderStatus: this.statusControl,
      paymentStatus: this.paymentStatusControl,
      deliveryFee: this.salesForm.controls.deliveryFee,
      confirmedDelivery: this.confirmDeliveryDate,
      arrivalDate: this.arrivalDateControl,
      terms: this.termsEditor(),
      lineItems: this.lineItems,
      control: (value) => this.fb.control(value),
    });
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

    /* Keyed by row position, so dropping a row from the middle has to shift
       the errors after it down with the rows they describe. */
    this.setLineItemErrors(reindexControlMap(this.lineItemValidationErrors(), index));
  }

  public onLineItemChange(index: number, lineItem: SaleLineItemDto): void {
    this.lineItems.at(index).setValue({
      ...lineItem,
    });
  }

  public onLineItemValidationError(index: number, hasError: boolean): void {
    this.setLineItemErrors(new Map(this.lineItemValidationErrors()).set(index, hasError));
  }

  private setLineItemErrors(errors: Map<number, boolean>): void {
    this.lineItemValidationErrors.set(errors);
    this.hasLineItemErrors.set([...errors.values()].some(Boolean));
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
        /* Empty array rather than omitted, so removing every instruction
           clears the stored ones instead of leaving them untouched. */
        paymentInstructions: this.paymentTerms()?.instructions ?? [],
        invoiceRemarks: this.paymentTerms()?.remarks ?? null,
        /* Sent only while the field is on screen. Including it for a
           sale that is not in transit would clear a date the admin was
           never shown and had no chance to keep. */
        ...(this.showArrivalDate()
          ? { estimatedArrivalDate: arrivalDateForApi(this.arrivalDateControl.value) }
          : {}),
      };

      if (this.isEditMode && this.saleId) {
        this.saveEdit(common);
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

  /**
   * Save an edit, recording the settling payment first where one is armed.
   *
   * Payment before sale, and the sale is not saved at all if the payment
   * fails — the alternative leaves a sale labelled Paid with nothing behind
   * it, which is the bug this whole panel exists to stop.
   *
   * `paymentStatus` is then dropped from the payload. Recording a confirmed
   * payment makes the server re-derive the status from the ledger, and that
   * answer is better than the dropdown's: it knows whether the money just
   * recorded actually covers the bill.
   */
  private saveEdit(common: Omit<UpdatePayloadInput, 'canEditContents' | 'overriding'>): void {
    const panel = this.settlementPanel();

    (panel ? panel.settle() : of(false))
      .pipe(
        map((recorded) =>
          buildSaleUpdatePayload({
            ...common,
            paymentStatus: recorded ? undefined : common.paymentStatus,
            canEditContents: this.lock.canEditContents(),
            overriding: this.lock.isOverriding(),
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saleData) =>
          this.store.dispatch(updateSale({ id: this.saleId as string, saleData })),
        /* The panel states the failure inline and the sale stays unsaved, so
           the admin can retry or untick without losing the form. */
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Payment not recorded',
            detail: 'The sale was not saved. Check the payment details and try again.',
          }),
      });
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
