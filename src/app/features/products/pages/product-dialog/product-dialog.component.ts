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
  QuantityUnit,
  UnitOfMeasurement,
  UpdateProductDto,
} from '../../models/product.model';
import {
  CERTIFICATION_OPTIONS,
  PRODUCT_CATEGORIES,
  PRODUCT_GRADE_OPTIONS,
  PRODUCT_STATUS_OPTIONS,
  QUANTITY_UNIT_OPTIONS,
  UNIT_OF_MEASUREMENT_OPTIONS,
} from '../../constants/product-options.constants';

import { ProductFormValue } from '../../types/product-form-value.type';
import { buildProductPayload } from '../../utils/product-payload';
import { InBoxPriceLink } from '../../utils/in-box-price-link';
import { PRODUCT_FORM_DEFAULTS } from '../../utils/product-form-defaults';
import { FieldRendererComponent } from '@shared/components/field-renderer/field-renderer.component';
import { ImageSectionComponent } from '@shared/components/image-section/image-section.component';
import { ScrollToErrorDirective } from '@shared/directives/scroll-to-error.directive';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, take } from 'rxjs/operators';
import { BatchApiService } from '../../../batches/services/batch-api.service';
import { Batch } from '../../../batches/models/batch.model';
import { getQualityStatusSeverity } from '@shared/utils/quality-status.util';
import { DialogFormSeeder } from '@shared/utils/dialog-form-seeder';
import { CustomValidators } from '@shared/validators/custom-validators';

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
    quantityUnit: this.fb.control<QuantityUnit>(QuantityUnit.PIECE),
    grade: this.fb.control<ProductGrade | null>(null),
    // Numbers only — the unit lives in `unitOfMeasurement`, and the two are
    // joined for display ("500" + Gram → "500g"). A unit typed in here would
    // show up twice.
    weight: this.fb.control('', { validators: [CustomValidators.numeric] }),
    ingredients: this.fb.control<string[]>([], {
      validators: [Validators.required, Validators.minLength(1)],
    }),

    // Opt-in notification. Describes the save action, not the product, so it
    // is never seeded from the loaded product and resets with the form.
    notifyPriceChange: this.fb.control(false),
    notifyNewProduct: this.fb.control(false),

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

  /** Derives In-Box Price from Wholesale Price x Quantity per Box. */
  private readonly inBoxPriceLink = new InBoxPriceLink(this.productForm.controls);

  public readonly inBoxPriceOverridden = this.inBoxPriceLink.overridden;
  public readonly calculatedInBoxPrice = this.inBoxPriceLink.calculated;

  // Options
  public readonly categoryOptions = PRODUCT_CATEGORIES;
  public readonly statusOptions = PRODUCT_STATUS_OPTIONS;
  public readonly gradeOptions = PRODUCT_GRADE_OPTIONS;
  public readonly unitOfMeasurementOptions = UNIT_OF_MEASUREMENT_OPTIONS;
  public readonly quantityUnitOptions = QUANTITY_UNIT_OPTIONS;
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
    this.inBoxPriceLink.connect();

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

    // This effect re-runs while the dialog is open, so the form must be seeded
    // once per open — otherwise every pass wipes the user's input.
    const seeder = new DialogFormSeeder();

    effect(() => {
      const visible = this.visible();
      const product = this.product();

      if (!visible) {
        seeder.markClosed();
        return;
      }

      if (!seeder.shouldSeed(product?.id ?? null)) {
        return;
      }

      if (product) {
        this.productForm.patchValue({
          ...product,
          minOrderQuantity: product.minOrderQuantity || 1,
          ingredients: product.ingredients.map(({ id }) => id),
          costPrice: product.costPrice ?? null,
        });
        // A stored price that does not match the formula was set by hand, so
        // opening this product for an unrelated edit must not reprice its boxes.
        this.inBoxPriceLink.resync();
      } else {
        this.resetForm();
      }
    });
  }

  /** Drops a hand-typed In-Box Price in favour of the calculated one. */
  public resetInBoxPrice(): void {
    this.inBoxPriceLink.reset();
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
    const productData = buildProductPayload(this.productForm.value as ProductFormValue);
    this.performSave(productData);
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
          dto: {
            ...(productData as UpdateProductDto),
            // Update-only: CreateProductDto does not declare it, and the API
            // rejects unknown properties.
            notifyPriceChange: this.productForm.value.notifyPriceChange || undefined,
          },
        }),
      );
    } else {
      this.store.dispatch(
        ProductsActions.createProduct({
          dto: {
            ...(productData as CreateProductDto),
            // Create-only: announcing an edit is `notifyPriceChange`'s job.
            notifyNewProduct: this.productForm.value.notifyNewProduct || undefined,
          },
        }),
      );
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
    this.productForm.reset({ ...PRODUCT_FORM_DEFAULTS });
    this.inBoxPriceLink.resync();
  }

  protected readonly getQualityStatusSeverity = getQualityStatusSeverity;
}
