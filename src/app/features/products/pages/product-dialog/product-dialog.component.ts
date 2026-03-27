/**
 * Product Dialog Component
 * Modal dialog for creating and editing products
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
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { first, forkJoin } from 'rxjs';
import { Actions, ofType } from '@ngrx/effects';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { FileSelectEvent } from 'primeng/fileupload';
import { MessageService, PrimeTemplate } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import * as ProductsActions from '../../store/products.actions';
import { IngredientApiService } from '../../services/ingredient-api.service';
import { UploadService } from '@services/upload.service';
import {
  CreateProductDto,
  Product,
  ProductCategory,
  ProductGrade,
  ProductStatus,
  UnitOfMeasurement,
  UpdateProductDto,
} from '../../models/product.model';
import {
  CERTIFICATION_OPTIONS,
  PRODUCT_CATEGORIES,
  PRODUCT_GRADE_OPTIONS,
  PRODUCT_STATUS_OPTIONS,
  UNIT_OF_MEASUREMENT_OPTIONS,
} from '../../constants/product-options.constants';

import { ProductFormValue } from '../../types/product-form-value.type';
import { FieldRendererComponent } from '@shared/components/field-renderer/field-renderer.component';
import { ImageSectionComponent } from '@shared/components/image-section/image-section.component';
import { ScrollToErrorDirective } from '@shared/directives/scroll-to-error.directive';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, take } from 'rxjs/operators';
import { BatchApiService } from '../../../batches/services/batch-api.service';
import { Batch } from '../../../batches/models/batch.model';
import { getQualityStatusSeverity } from '@shared/utils/quality-status.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-product-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Dialog,
    Button,
    PrimeTemplate,
    FieldRendererComponent,
    ImageSectionComponent,
    ScrollToErrorDirective,
    TableModule,
    TagModule,
  ],
  templateUrl: './product-dialog.component.html',
  styleUrl: './product-dialog.component.scss',
})
export class ProductDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly ingredientApiService = inject(IngredientApiService);
  private readonly uploadService = inject(UploadService);
  private readonly actions$ = inject(Actions);
  private readonly messageService = inject(MessageService);
  private readonly batchApiService = inject(BatchApiService);

  // Inputs
  public readonly visible = input.required<boolean>();
  public readonly product = input<Product | null>();
  public readonly viewMode = input<boolean>(false);

  // Outputs
  public readonly visibleChange = output<boolean>();
  public readonly save = output<CreateProductDto | UpdateProductDto>();
  public readonly saveSuccess = output<void>();

  // Signals
  public readonly loading = signal(false);
  public readonly isEdit = computed(() => !!this.product());
  public readonly errorMessage = signal<string | null>(null);
  public readonly ingredientsOptions = toSignal(
    this.ingredientApiService
      .getAllIngredients()
      .pipe(map((ing) => ing.map(({ id, name }) => ({ label: name, value: id })))),
    { initialValue: [] },
  );
  public readonly productBatches = signal<Batch[]>([]);

  public readonly productForm = this.fb.group({
    // Basic Info
    name: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    }),
    sku: this.fb.control('', { validators: [Validators.maxLength(50)] }),
    description: this.fb.control('', {
      validators: [Validators.required, Validators.maxLength(1000)],
    }),
    category: this.fb.control<ProductCategory | null>(null, {
      validators: [Validators.required],
    }),
    status: this.fb.control<ProductStatus>('active', { validators: [Validators.required] }),

    // Pricing
    wholesale: this.fb.control(0, { validators: [Validators.required, Validators.min(0)] }),
    retail: this.fb.control(0, { validators: [Validators.required, Validators.min(0)] }),
    inBoxPrice: this.fb.control(0, { validators: [Validators.min(0)] }),
    costPrice: this.fb.control(0, { validators: [Validators.min(0)] }),

    // Inventory
    quantityInBox: this.fb.control(1, { validators: [Validators.min(1)] }),
    minOrderQuantity: this.fb.control(1, { validators: [Validators.required, Validators.min(1)] }),

    // Product Details
    unitOfMeasurement: this.fb.control<UnitOfMeasurement | null>(null),
    grade: this.fb.control<ProductGrade | null>(null),
    weight: this.fb.control(''),
    ingredients: this.fb.control<string[]>([], {
      validators: [Validators.required, Validators.minLength(1)],
    }),

    // Features
    isFeatured: this.fb.control(false),
    isOrganic: this.fb.control(false),

    // Images
    images: this.fb.control<string[]>([]),
    image: this.fb.control(''),

    // Additional
    supplierReference: this.fb.control(''),
    certifications: this.fb.control<string[]>([]),
  });

  // Options
  public readonly categoryOptions = PRODUCT_CATEGORIES;
  public readonly statusOptions = PRODUCT_STATUS_OPTIONS;
  public readonly gradeOptions = PRODUCT_GRADE_OPTIONS;
  public readonly unitOfMeasurementOptions = UNIT_OF_MEASUREMENT_OPTIONS;
  public readonly certificationOptions = CERTIFICATION_OPTIONS.map((option) => ({
    label: option,
    value: option,
  }));

  // Mode helpers
  public readonly isViewMode = computed(() => this.viewMode());
  public readonly dialogTitle = computed(() => {
    if (this.isViewMode()) {
      return 'View Product';
    }
    return this.isEdit() ? 'Edit Product' : 'Add New Product';
  });
  public readonly showFooterActions = computed(() => !this.viewMode());

  constructor() {
    effect(() => {
      const product = this.product();
      const isView = this.viewMode();

      if (product && isView) {
        this.batchApiService
          .getBatchesByProduct(product.id)
          .pipe(first())
          .subscribe({
            next: (response) => {
              this.productBatches.set(response.data);
            },
            error: (error) => {
              console.error('Failed to load batches:', error);
              this.productBatches.set([]);
            },
          });
      } else {
        this.productBatches.set([]);
      }
    });

    // Track the last processed product for form patching
    let lastPatchedProductId: string | null = null;

    effect(() => {
      const visible = this.visible();
      const product = this.product();

      // Reset tracking when dialog is hidden so re-opening for the same product re-patches the form
      if (!visible) {
        lastPatchedProductId = null;
        return;
      }

      // Only patch form if product actually changed
      // This is a workaround to avoid duplicate form patching when product changes
      if (product?.id === lastPatchedProductId && product !== null) {
        return;
      }

      lastPatchedProductId = product?.id ?? null;
      if (product) {
        this.productForm.patchValue({
          ...product,
          minOrderQuantity: product.minOrderQuantity || 1,
          ingredients: product.ingredients.map(({ id }) => id),
          costPrice: product.costPrice ?? null,
        });
      } else {
        this.resetForm();
      }
    });
  }

  public onHide(): void {
    this.visibleChange.emit(false);
    this.errorMessage.set(null); // Clear error message
    this.resetForm();
  }

  public onSave(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    const productData = this.buildProductData(this.productForm.value as ProductFormValue);
    this.performSave(productData);
  }

  private buildProductData(formValue: ProductFormValue): CreateProductDto | UpdateProductDto {
    return {
      name: formValue.name!,
      description: formValue.description!,
      category: formValue.category!,
      wholesale: formValue.wholesale!,
      retail: formValue.retail!,
      sku: formValue.sku || undefined,
      status: formValue.status as ProductStatus,
      unitOfMeasurement: formValue.unitOfMeasurement || undefined,
      grade: formValue.grade || undefined,
      weight: formValue.weight || undefined,
      ingredients: formValue.ingredients || [],
      inBoxPrice: formValue.inBoxPrice || undefined,
      quantityInBox: formValue.quantityInBox || undefined,
      minOrderQuantity: formValue.minOrderQuantity || undefined,
      isFeatured: formValue.isFeatured || false,
      isOrganic: formValue.isOrganic || false,
      supplierReference: formValue.supplierReference || undefined,
      certifications: formValue.certifications || [],
      images: formValue.images || [],
      image: formValue.image || undefined,
      costPrice: formValue.costPrice || undefined,
    };
  }

  private performSave(productData: CreateProductDto | UpdateProductDto): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const successAction = this.isEdit()
      ? ProductsActions.updateProductSuccess
      : ProductsActions.createProductSuccess;
    const failureAction = this.isEdit()
      ? ProductsActions.updateProductFailure
      : ProductsActions.createProductFailure;

    // Subscribe to success action
    this.actions$
      .pipe(ofType(successAction))
      .pipe(take(1))
      .subscribe(() => {
        this.loading.set(false);
        this.onHide();
        this.saveSuccess.emit(); // Emit save success event
      });

    // Subscribe to failure action
    this.actions$
      .pipe(ofType(failureAction))
      .pipe(take(1))
      .subscribe((action) => {
        this.loading.set(false);
        console.error('Product save failed:', action.error);
        const errorMsg = action.error ?? 'Failed to save product. Please try again.';
        this.errorMessage.set(errorMsg);
      });

    if (this.isEdit()) {
      this.store.dispatch(
        ProductsActions.updateProduct({
          id: this.product()!.id,
          dto: productData as UpdateProductDto,
        }),
      );
    } else {
      this.store.dispatch(ProductsActions.createProduct({ dto: productData as CreateProductDto }));
    }
  }

  public onPrimaryImageUpload(event: FileSelectEvent): void {
    const file = event.files[0];
    if (file) {
      this.uploadService.uploadImage(file).subscribe({
        next: ({ data }) => this.productForm.patchValue({ image: data }),
        error: (error) => {
          console.error('Upload failed:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Upload Failed',
            detail: 'Failed to upload primary image. Please try again.',
          });
        },
      });
    }
  }

  public onImagesUpload(event: FileSelectEvent): void {
    const files = event.files;
    if (files && files.length > 0) {
      const currentImages = this.productForm.value.images || [];
      const uploadRequests = files.map((file: File) => this.uploadService.uploadImage(file));

      forkJoin(uploadRequests).subscribe({
        next: (responses) => {
          // All uploads complete successfully
          const newImages = responses.map((response) => response.data);
          this.productForm.patchValue({ images: [...currentImages, ...newImages] });
        },
        error: (error) => {
          console.error('Upload failed:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Upload Failed',
            detail: 'Failed to upload images. Please try again.',
          });
        },
      });
    }
  }

  private resetForm(): void {
    this.productForm.reset({
      status: 'active',
      wholesale: 0,
      retail: 0,
      inBoxPrice: 0,
      quantityInBox: 1,
      minOrderQuantity: 1,
      isFeatured: false,
      isOrganic: false,
      ingredients: [],
      certifications: [],
      images: [],
      image: '',
      costPrice: 0,
    });
  }

  protected readonly getQualityStatusSeverity = getQualityStatusSeverity;
}
