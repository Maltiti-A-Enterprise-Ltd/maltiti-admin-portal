/**
 * Batches List Page Component
 * Main page for displaying and managing product batches
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
} from '@angular/core';

import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { CardModule } from 'primeng/card';

// Store
import * as BatchesActions from '../../store/batches.actions';
import { selectAllBatches, selectBatchesLoading } from '../../store/batches.selectors';

// Models
import { Batch, BatchQueryParams, CreateBatchDto } from '../../models/batch.model';
import { BatchDialogComponent } from '../batch-dialog/batch-dialog.component';
import { ProductApiService } from '../../../products/services/product-api.service';
import { LightProduct } from '../../../products/models/product.model';
import { SelectComponent } from '@shared/components/select/select.component';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { getQualityStatusSeverity } from '@shared/utils/quality-status.util';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductNamePipe } from '@shared/pipes/product-name.pipe';

@Component({
  selector: 'app-batches-list',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    DialogModule,
    TooltipModule,
    SkeletonModule,
    CardModule,
    SelectComponent,
    InputComponent,
    ButtonComponent,
    BatchDialogComponent,
    ProductNamePipe,
  ],
  templateUrl: './batches-list.component.html',
  styleUrl: './batches-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchesListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(Store);
  private readonly productApiService = inject(ProductApiService);

  // Store signals
  public readonly batches = this.store.selectSignal(selectAllBatches);
  public readonly loading = this.store.selectSignal(selectBatchesLoading);

  // Dialog signals
  public readonly showBatchDialog = signal(false);
  public readonly selectedBatch = signal<Batch | null>(null);

  // Filter signals
  public readonly products = signal<LightProduct[]>([]);
  public readonly currentFilters = signal<BatchQueryParams>({});
  public readonly productOptions = computed(() =>
    this.products().map((product) => ({
      label: product.name,
      value: product.id,
    })),
  );

  // Filter form controls
  public readonly productFilterControl = new FormControl<string | null>(null);
  public readonly batchNumberFilterControl = new FormControl<string>('');
  public readonly qualityStatusFilterControl = new FormControl<string | null>(null);

  public ngOnInit(): void {
    this.loadProducts();
    this.loadBatches();
    this.setupFilterSubscriptions();
  }

  public loadProducts(): void {
    this.productApiService.getAllProductsSimple().subscribe({
      next: (response) => {
        this.products.set(response.data);
      },
      error: (error) => {
        console.error('Failed to load products:', error);
        this.products.set([]);
      },
    });
  }

  public loadBatches(params?: BatchQueryParams): void {
    this.store.dispatch(BatchesActions.loadBatches({ params: params || {} }));
  }

  public onCreateBatch(): void {
    this.selectedBatch.set(null);
    this.showBatchDialog.set(true);
  }

  public onViewBatch(batch: Batch): void {
    this.store.dispatch(BatchesActions.loadBatch({ id: batch.id }));
    this.selectedBatch.set(batch);
    this.showBatchDialog.set(true);
  }

  public onSaveBatch(batchData: CreateBatchDto | Partial<CreateBatchDto>): void {
    this.store.dispatch(BatchesActions.createBatch({ dto: batchData as CreateBatchDto }));
  }

  public onBatchDialogVisibleChange(visible: boolean): void {
    this.showBatchDialog.set(visible);
    if (!visible) {
      this.selectedBatch.set(null);
    }
  }

  public formatDate(dateString: string): string {
    if (!dateString) {
      return 'N/A';
    }
    return new Date(dateString).toLocaleDateString('en-GB');
  }

  public onClearFilters(): void {
    this.productFilterControl.setValue(null);
    this.batchNumberFilterControl.setValue('');
    this.qualityStatusFilterControl.setValue(null);
    this.currentFilters.set({});
    this.loadBatches();
  }

  private setupFilterSubscriptions(): void {
    this.productFilterControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.updateFilters('productId', value);
      });

    this.batchNumberFilterControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.updateFilters('batchNumber', value);
      });

    this.qualityStatusFilterControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.updateFilters('qualityCheckStatus', value);
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private updateFilters(filterType: keyof BatchQueryParams, value: any): void {
    const currentFilters = this.currentFilters();
    const newFilters = { ...currentFilters };

    if (value === null || value === undefined || value === '') {
      delete newFilters[filterType];
    } else {
      newFilters[filterType] = value;
    }

    this.currentFilters.set(newFilters);
    this.loadBatches(newFilters);
  }

  protected readonly getQualityStatusSeverity = getQualityStatusSeverity;
}
