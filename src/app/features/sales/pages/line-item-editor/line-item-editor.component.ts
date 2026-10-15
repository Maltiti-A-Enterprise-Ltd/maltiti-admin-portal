import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  Signal,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InvoiceCurrency, PriceType, SaleLineItemDto } from '../../models/sale.model';
import { ButtonComponent } from '@shared/components/button/button.component';
import { NumberInputComponent } from '@shared/components/number-input/number-input.component';
import { SelectComponent } from '@shared/components/select/select.component';
import { LightProduct } from '../../../products/models/product.model';
import { Batch } from '../../../batches/models/batch.model';
import { BoxQuantityLink } from '../../utils/box-quantity-link';
import { WeightQuantityLink } from '../../utils/weight-quantity-link';
import { clearBatchErrors } from '../../utils/batch-errors';
import { reindexControlMap } from '../../utils/reindex-control-map';
import { TooltipModule } from 'primeng/tooltip';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, merge, Subject, switchMap } from 'rxjs';
import { Message } from 'primeng/message';
import { filter, map, startWith } from 'rxjs/operators';
import { productName } from '@shared/utils/product-name';

import { LinePrice } from '../../utils/line-price';
import { batchInfo, controlAt } from '../../utils/batch-allocation-lookup';
import { allocationSummary } from '../../utils/allocation-summary';
@Component({
  selector: 'app-line-item-editor',
  standalone: true,
  templateUrl: './line-item-editor.component.html',
  styleUrls: ['./line-item-editor.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputNumberModule,
    CardModule,
    RadioButtonModule,
    ButtonComponent,
    NumberInputComponent,
    SelectComponent,
    TooltipModule,
    Message,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
})
export class LineItemEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  public readonly batches = signal<Batch[]>([]);
  private readonly allocationBehavior = new Subject<void>();
  public readonly lineItem = input<SaleLineItemDto | null>(null);
  public readonly products = input<LightProduct[]>([]);
  public readonly isPaid = input<boolean>(false);
  /** The sale's currency. Line prices are denominated in it. */
  public readonly currency = input<InvoiceCurrency | undefined>(undefined);
  public readonly availableBatches = input<Map<string, Batch[]>>();
  public readonly lineItemChange = output<SaleLineItemDto>();
  public readonly remove = output<void>();
  public readonly validationError = output<boolean>();
  public lineItemForm = this.fb.group({
    productId: ['', Validators.required],
    requestedQuantity: [1, [Validators.required, Validators.min(1)]],
    customPrice: [undefined as number | undefined, Validators.min(0)],
    finalPrice: [undefined as number | undefined, Validators.min(0)],
    priceType: ['wholesale' as PriceType],
  });

  public readonly productId = toSignal(this.lineItemForm.controls.productId.valueChanges, {
    initialValue: null,
  });
  public readonly selectedProduct: Signal<LightProduct | null> = computed(() => {
    return this.products().find((p) => p.id === this.productId()) || null;
  });
  /**
   * Lets the line be entered in boxes. Kept outside `lineItemForm` on purpose:
   * `emitChange` spreads the whole form into the payload, and the API rejects
   * properties it does not know.
   */
  /** Where a line's price comes from, and what currency it is in. */
  public readonly price = new LinePrice(
    this.lineItemForm.controls.customPrice,
    this.lineItemForm.controls.requestedQuantity,
    this.lineItemForm.controls.priceType,
    this.selectedProduct,
    this.currency,
  );

  public readonly boxLink = new BoxQuantityLink(
    this.lineItemForm.controls.requestedQuantity,
    this.selectedProduct,
  );
  /** For loose goods, ordered by the tonne rather than by the tub. */
  public readonly weightLink = new WeightQuantityLink(
    this.lineItemForm.controls.requestedQuantity,
    this.selectedProduct,
  );
  public readonly totalAllocatedQuantity = computed(
    () =>
      this.lineItem()
        ?.batchAllocations?.map(({ quantity }) => quantity)
        .reduce((a, b) => a + b, 0) ?? 0,
  );
  public readonly batchOptions = computed(() =>
    this.batches().map((b) => ({ label: b.batchNumber, value: b.id })),
  );
  public priceType: PriceType = 'wholesale';
  public readonly batchControls = signal(new Map<number, FormControl<string | null>>());
  public readonly quantityControls = signal(new Map<number, FormControl<number | null>>());

  constructor() {
    this.boxLink.connect();
    this.weightLink.connect();

    effect(() => {
      if (this.isPaid()) {
        this.lineItemForm.controls.customPrice.disable();
        this.lineItemForm.controls.requestedQuantity.disable();
        this.lineItemForm.controls.productId.disable();
        this.lineItemForm.controls.priceType.disable();
      } else {
        this.lineItemForm.controls.customPrice.enable();
        this.lineItemForm.controls.requestedQuantity.enable();
        this.lineItemForm.controls.productId.enable();
        this.lineItemForm.controls.priceType.enable();
      }
    });
    effect(() => this.validateBatchAllocations());
    effect(() => {
      const productId = this.productId();
      const batchesMap = this.availableBatches();
      if (productId && batchesMap) {
        this.batches.set(batchesMap.get(productId) || []);
      } else {
        this.batches.set([]);
      }
    });
    this.lineItemForm
      .get('productId')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onProductChange());
    // One subscription on the group, not per control. The parent builds its
    // request from what this component emits, so anything edited here that is
    // not emitted simply never ships — and a per-control list is exactly how
    // quantity and custom price came to be missing from it.
    //
    // It has to be the group: Angular emits a child control's valueChanges
    // *before* recalculating the group's status, so `lineItemForm.invalid` read
    // from a child subscription is stale by one edit — which would drop the
    // very change that makes an invalid line item valid again.
    this.lineItemForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncWithParent());
    this.lineItemForm
      .get('priceType')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((priceType) => this.onPriceTypeChange(priceType as PriceType));
  }

  public ngOnInit(): void {
    this.setUpBatchAllocationChanges();
    if (this.lineItem()) {
      this.loadLineItem(this.lineItem()!);
    }
    this.validateBatchAllocations();
  }

  private loadLineItem(item: SaleLineItemDto): void {
    this.lineItemForm.patchValue({
      productId: item.productId,
      requestedQuantity: item.requestedQuantity,
      customPrice: item.customPrice ? Number(item.customPrice) : undefined,
      finalPrice: item.finalPrice ? Number(item.finalPrice) : undefined,
      priceType: 'retail', // Default to retail
    });

    if (item.batchAllocations && item.batchAllocations.length > 0) {
      this.batchControls.update((batchMap) => {
        const newMap = new Map(batchMap);
        newMap.clear();
        item.batchAllocations.forEach((allocation, index) => {
          const batchControl = new FormControl(allocation.batchId, {
            validators: Validators.required,
          });
          newMap.set(index, batchControl);
        });
        return newMap;
      });

      this.quantityControls.update((quantityMap) => {
        const newMap = new Map(quantityMap);
        newMap.clear();
        item.batchAllocations.forEach((allocation, index) => {
          const quantityControl = new FormControl(allocation.quantity, {
            validators: Validators.required,
          });
          newMap.set(index, quantityControl);
        });
        return newMap;
      });

      this.allocationBehavior.next();
    }
  }

  private onProductChange(): void {
    this.price.fillIfEmpty();
  }

  private onPriceTypeChange(priceType: PriceType): void {
    this.priceType = priceType;
    this.price.fillFromCatalogue();
  }

  public addBatchAllocation(): void {
    if (!this.selectedProduct) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select a product first',
      });
      return;
    }
    this.batchControls.update((batchMap) => {
      const newMap = new Map(batchMap);
      newMap.set(newMap.size, new FormControl('', { validators: Validators.required }));
      return newMap;
    });
    this.quantityControls.update((quantityMap) => {
      const newMap = new Map(quantityMap);
      newMap.set(newMap.size, new FormControl(null, { validators: Validators.required }));
      return newMap;
    });
    this.allocationBehavior.next();
  }

  public removeBatchAllocation(index: number): void {
    const currentAllocations = [...(this.lineItem()?.batchAllocations || [])];
    currentAllocations.splice(index, 1);

    this.reindexControlMaps(index);

    const updatedItem: SaleLineItemDto = {
      ...(this.lineItemForm.value as SaleLineItemDto),
      batchAllocations: currentAllocations,
    };
    this.lineItemChange.emit(updatedItem);
    this.validateBatchAllocations();
  }

  private setUpBatchAllocationChanges(): void {
    this.allocationBehavior
      .pipe(
        switchMap(() => {
          const streams = Array.from(this.batchControls().entries()).map((_, batchIndex) => {
            const quantityControl = this.quantityControls().get(batchIndex)!;
            const batchControl = this.batchControls().get(batchIndex)!;
            return combineLatest([
              quantityControl.valueChanges.pipe(startWith(quantityControl.value)),
              batchControl.valueChanges.pipe(startWith(batchControl.value)),
            ]).pipe(
              filter(([quantity, batchId]) => !!quantity && !!batchId),
              map(([quantity, batchId]) => ({ quantity, batchId })),
            );
          });
          return merge(...streams);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ quantity, batchId }) => this.updateBatchAllocations(quantity!, batchId!));
  }

  private updateBatchAllocations(quantity: number, batchId: string): void {
    const currentAllocations = this.lineItem()?.batchAllocations ?? [];
    const allocationIndex = currentAllocations.findIndex((a) => a.batchId === batchId);

    const updatedAllocations =
      allocationIndex > -1
        ? currentAllocations.map((a, i) => (i === allocationIndex ? { ...a, quantity } : a))
        : [...currentAllocations, { batchId, quantity }];

    this.lineItemChange.emit({
      ...(this.lineItemForm.getRawValue() as Omit<SaleLineItemDto, 'batchAllocations'>),
      batchAllocations: updatedAllocations,
    });
    this.validateBatchAllocations();
  }

  private reindexControlMaps(removedIndex: number): void {
    this.batchControls.update((controls) => reindexControlMap(controls, removedIndex));
    this.quantityControls.update((controls) => reindexControlMap(controls, removedIndex));
  }

  /**
   * Batches are optional on every line.
   *
   * They are not rolled out across the catalogue, so requiring them stopped
   * ordinary sales from being recorded at all. Allocating none, or only part
   * of a line, is fine — the rest simply came from stock that is not tracked
   * in batches. Allocating *more* than was sold is still wrong, and is the
   * one thing left to complain about.
   */
  private validateBatchAllocations(): void {
    const requestedQuantity = this.lineItemForm.get('requestedQuantity')?.value || 0;
    const totalAllocated = this.totalAllocatedQuantity();
    const quantityControl = this.lineItemForm.get('requestedQuantity') as FormControl;
    let hasError = false;

    if (totalAllocated > requestedQuantity) {
      quantityControl?.setErrors({ batchOverAllocated: true });
      hasError = true;
    } else {
      clearBatchErrors(quantityControl);
    }

    // Report the form's own validity too, not just batch problems. The parent
    // builds its request from the last *valid* value this component emitted, so
    // without this an incomplete line item submits silently with stale data.
    this.validationError.emit(hasError || this.lineItemForm.invalid);
  }

  public getTotalPrice(): number {
    return this.price.total();
  }

  /** "Allocated: 3 / 5 (2 remaining)" — see `allocationSummary`. */
  public allocationSummaryText(): string {
    return allocationSummary(
      this.totalAllocatedQuantity(),
      this.lineItemForm.controls.requestedQuantity.value || 0,
    );
  }

  /**
   * Re-check this line item and hand the result to the parent: the fresh values
   * when it is valid, and either way an up-to-date validity signal so the
   * parent can refuse to submit a line item it would otherwise send stale.
   */
  private syncWithParent(): void {
    this.validateBatchAllocations();
    this.emitChange();
  }

  private emitChange(): void {
    if (!this.lineItemForm.valid) {
      return;
    }
    const lineItemForm = this.lineItemForm.getRawValue() as SaleLineItemDto & {
      priceType?: PriceType;
    };
    delete lineItemForm.priceType;
    const lineItem: SaleLineItemDto = {
      ...lineItemForm,
      batchAllocations: this.lineItem()?.batchAllocations || [],
    };
    this.lineItemChange.emit(lineItem);
  }

  public onRemove(): void {
    this.remove.emit();
  }

  public getBatchControl(index: number): FormControl {
    return controlAt(this.batchControls(), index, '');
  }

  public getQuantityControl(index: number): FormControl {
    return controlAt(this.quantityControls(), index, 1);
  }

  public getBatchInfo(
    batchId: string,
  ): { availableQuantity: number; expiryDate: string | null } | null {
    return batchInfo(this.batches(), batchId);
  }

  public get productOptions(): { label: string; value: string }[] {
    return this.products().map((product) => ({ label: productName(product), value: product.id }));
  }
}
