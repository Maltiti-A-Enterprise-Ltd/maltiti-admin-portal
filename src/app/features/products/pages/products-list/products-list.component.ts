/**
 * Products List Page Component
 * Main page for displaying and managing products with filters, search, and CRUD operations
 * Uses Angular signals for reactive state management
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { debounceTime, startWith } from 'rxjs/operators';

// PrimeNG Imports
import { TableModule, TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';

// Store
import * as ProductsActions from '../../store/products.actions';
import {
  selectAllProducts,
  selectProductsLoading,
  selectTotalProducts,
} from '../../store/products.selectors';

import {
  Product,
  ProductCategory,
  ProductQueryParams,
  ProductStatus,
  UnitOfMeasurement,
} from '../../models/product.model';
import { InputComponent } from '@shared/components/input/input.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { SelectComponent } from '@shared/components/select/select.component';
import { ProductDialogComponent } from '../product-dialog/product-dialog.component';
import { ProductApiService } from '../../services/product-api.service';
import { PRODUCT_CATEGORIES } from '../../constants/product-options.constants';
import { ProductNamePipe } from '@shared/pipes/product-name.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-products-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ConfirmDialogModule,
    DialogModule,
    TooltipModule,
    SkeletonModule,
    InputComponent,
    ButtonComponent,
    SelectComponent,
    ProductDialogComponent,
    ProductNamePipe,
  ],
  providers: [ConfirmationService],
  templateUrl: './products-list.component.html',
  styleUrl: './products-list.component.scss',
})
export class ProductsListComponent {
  private readonly store = inject(Store);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly productApiService = inject(ProductApiService);

  // Unit of measurement symbols
  public readonly unitSymbols: Record<UnitOfMeasurement, string> = {
    [UnitOfMeasurement.KILOGRAM]: 'kg',
    [UnitOfMeasurement.GRAM]: 'g',
    [UnitOfMeasurement.LITRE]: 'L',
    [UnitOfMeasurement.MILLILITRE]: 'mL',
  };

  // Store signals
  public readonly products = this.store.selectSignal(selectAllProducts);
  public readonly loading = this.store.selectSignal(selectProductsLoading);
  public readonly totalItems = this.store.selectSignal(selectTotalProducts);

  public searchControl = new FormControl('');

  public readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(startWith(''), debounceTime(1000)),
    { initialValue: '' },
  );

  // Filter controls
  public categoryControl = new FormControl<ProductCategory | null>(null);
  public statusControl = new FormControl<ProductStatus | null>(null);

  public readonly category = toSignal(this.categoryControl.valueChanges.pipe(startWith(null)), {
    initialValue: null,
  });

  public readonly status = toSignal(this.statusControl.valueChanges.pipe(startWith(null)), {
    initialValue: null,
  });

  public readonly pageSize = signal(10);
  private readonly currentPage = signal(1);
  public readonly reloadTrigger = signal(0);

  // Dialog signals
  public readonly showProductDialog = signal(false);
  public readonly selectedProduct = signal<Product | null>(null);
  public readonly viewMode = signal(false);

  public categoryOptions = [{ label: 'All Categories', value: '' }, ...PRODUCT_CATEGORIES];

  public statusOptions = [
    { label: 'All Status', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Out of Stock', value: 'out_of_stock' },
    { label: 'Discontinued', value: 'discontinued' },
  ];

  // Computed query params
  public readonly queryParams = computed<ProductQueryParams>(() => ({
    page: this.currentPage(),
    limit: this.pageSize(),
    searchTerm: this.searchTerm() || undefined,
    category: this.category() || undefined,
    status: this.status() || undefined,
  }));

  constructor() {
    effect(() => {
      this.reloadTrigger(); // Trigger reload
      this.store.dispatch(ProductsActions.loadProducts({ params: this.queryParams() }));
    });
  }

  public onSearch(): void {
    this.currentPage.set(1);
  }

  public onPageChange(event: TablePageEvent): void {
    const page = event.first / event.rows + 1;
    this.currentPage.set(page);
    this.pageSize.set(event.rows);
  }

  public onCreateProduct(): void {
    this.selectedProduct.set(null);
    this.viewMode.set(false);
    this.showProductDialog.set(true);
  }

  public onEditProduct(product: Product): void {
    this.selectedProduct.set(product);
    this.viewMode.set(false);
    this.showProductDialog.set(true);
  }

  public onViewProduct(product: Product): void {
    this.selectedProduct.set(product);
    this.viewMode.set(true);
    this.showProductDialog.set(true);
  }

  public onDeleteProduct(product: Product): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${product.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.store.dispatch(ProductsActions.deleteProduct({ id: product.id }));
      },
    });
  }

  public onToggleStatus(product: Product): void {
    this.store.dispatch(ProductsActions.changeProductStatus({ id: product.id }));
    this.reloadTrigger.set(this.reloadTrigger() + 1); // Reload to reflect status change
  }

  public onProductSaved(): void {
    this.reloadTrigger.set(this.reloadTrigger() + 1);
  }

  public onExportExcel(): void {
    // Build query parameters for export (same as list but without pagination)
    const exportParams: Partial<ProductQueryParams> = {};

    if (this.searchTerm()) {
      exportParams.searchTerm = this.searchTerm()!;
    }

    if (this.category()) {
      exportParams.category = this.category()!;
    }

    if (this.status()) {
      exportParams.status = this.status()!;
    }

    // Make the API call to export endpoint
    this.productApiService.exportProductsToExcel(exportParams).subscribe({
      next: (response) => {
        const blob = new Blob([response], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        // Create download link
        const url = globalThis.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Generate filename with current date
        const currentDate = new Date().toISOString().split('T')[0];
        link.download = `products_export_${currentDate}.xlsx`;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Clean up
        link.remove();
        globalThis.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Export failed:', error);
      },
    });
  }

  public getStatusSeverity(status: ProductStatus): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warn';
      case 'out_of_stock':
        return 'danger';
      case 'discontinued':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  public formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(value);
  }
}
