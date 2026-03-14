/**
 * Batch Dialog Component
 * Modal dialog for creating and viewing batches
 * Uses reactive forms with validation and PrimeNG components
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { PrimeTemplate } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { Batch, CreateBatchDto, UpdateBatchDto } from '../../models/batch.model';
import { ProductApiService } from '../../../products/services/product-api.service';
import { SelectComponent } from '@shared/components/select/select.component';
import { NumberInputComponent } from '@shared/components/number-input/number-input.component';
import { InputComponent } from '@shared/components/input/input.component';
import { TextareaComponent } from '@shared/components/textarea/textarea.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, take } from 'rxjs/operators';
import { Actions, ofType } from '@ngrx/effects';
import { createBatchFailure, createBatchSuccess } from '../../store/batches.actions';
import { productName } from '@shared/utils/product-name';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-batch-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Dialog,
    Button,
    PrimeTemplate,
    TableModule,
    TagModule,
    CardModule,
    DatePicker,
    SelectComponent,
    NumberInputComponent,
    InputComponent,
    TextareaComponent,
  ],
  templateUrl: './batch-dialog.component.html',
  styleUrl: './batch-dialog.component.scss',
})
export class BatchDialogComponent {
  private readonly actions = inject(Actions);
  private readonly fb = inject(FormBuilder);
  private readonly productApiService = inject(ProductApiService);

  // Inputs
  public readonly visible = input.required<boolean>();
  public readonly batch = input<Batch | null>();
  public readonly viewMode = input<boolean>(false);

  // Outputs
  public readonly visibleChange = output<boolean>();
  public readonly save = output<CreateBatchDto | UpdateBatchDto>();
  public readonly saveSuccess = output<void>();

  // Signals
  public readonly loading = signal(false);
  public readonly isEdit = computed(() => !!this.batch());
  public readonly products = toSignal(
    this.productApiService.getAllProductsSimple().pipe(map(({ data }) => data)),
    {
      initialValue: [],
    },
  );
  public readonly productOptions = computed(() =>
    this.products().map((product) => ({
      label: productName(product),
      value: product.id,
    })),
  );

  // Form
  public readonly batchForm = this.fb.group({
    productId: ['', [Validators.required]],
    quantity: [0, [Validators.required, Validators.min(1)]],
    productionDate: [new Date()],
    expiryDate: [null as Date | null],
    manufacturingLocation: [''],
    qualityCheckStatus: [''],
    notes: [''],
  });

  constructor() {
    effect(() => {
      const batch = this.batch();
      if (batch && this.visible()) {
        this.batchForm.patchValue({
          productId: batch.product?.id || '',
          quantity: batch.quantity || 0,
          productionDate: new Date(batch.productionDate),
          expiryDate: new Date(batch.expiryDate),
          manufacturingLocation: batch.manufacturingLocation || '',
          qualityCheckStatus: batch.qualityCheckStatus || '',
          notes: batch.notes || '',
        });
      } else if (!batch && this.visible()) {
        this.batchForm.reset({
          quantity: 0,
        });
      }
    });
  }

  public onSave(): void {
    if (this.batchForm.invalid) {
      this.batchForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const formValue = this.batchForm.value;
    const batchData: CreateBatchDto = {
      productId: formValue.productId!,
      quantity: formValue.quantity ?? 0,
      productionDate: formValue.productionDate?.toISOString() || undefined,
      expiryDate: formValue.expiryDate?.toISOString() || undefined,
      manufacturingLocation: formValue.manufacturingLocation || undefined,
      qualityCheckStatus: formValue.qualityCheckStatus || undefined,
      notes: formValue.notes || undefined,
    };

    this.actions
      .pipe(ofType(createBatchSuccess, createBatchFailure), take(1))
      .subscribe((action) => {
        this.loading.set(false);
        if (action.type === createBatchSuccess.type) {
          this.saveSuccess.emit();
          this.visibleChange.emit(false);
        }
      });

    this.save.emit(batchData);
  }

  public onCancel(): void {
    this.visibleChange.emit(false);
  }
}
