import { FormBuilder, Validators } from '@angular/forms';
import { CustomValidators } from '@shared/validators/custom-validators';
import {
  DimensionUnit,
  ProductCategory,
  ProductGrade,
  ProductStatus,
  QuantityUnit,
  UnitOfMeasurement,
} from '../models/product.model';
import { ProductFormGroup } from '../types/product-form-value.type';

/**
 * The product dialog's form, built in one place.
 *
 * Lifted out of the component, which was over its length limit once the
 * dimensions group arrived. It also puts the form's shape next to
 * `PRODUCT_FORM_DEFAULTS` and `productFormSeed`, which already describe what
 * goes into it — the three had drifted apart only because this one happened
 * to be an inline field initialiser.
 */
export function createProductForm(fb: FormBuilder): ProductFormGroup {
  return fb.group({
    // Basic Info
    name: fb.control('', {
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    }),
    sku: fb.control('', { validators: [Validators.maxLength(50)] }),
    description: fb.control('', {
      validators: [Validators.required, Validators.maxLength(1000)],
    }),
    category: fb.control<ProductCategory | null>(null, {
      validators: [Validators.required],
    }),
    status: fb.control<ProductStatus>('active', { validators: [Validators.required] }),

    // Pricing
    /* Above zero, all three. A product saved at 0 sells for nothing, or
       reports every sale of it as pure profit. */
    wholesale: fb.control(0, { validators: [CustomValidators.positive] }),
    retail: fb.control(0, { validators: [CustomValidators.positive] }),
    inBoxPrice: fb.control(0, { validators: [Validators.min(0)] }),
    /* Not sent to the API — it describes how the price above was arrived at,
       not the product. `buildProductPayload` lists its fields explicitly, so
       this simply never reaches the request. */
    inBoxPriceOverride: fb.control(false),
    costPrice: fb.control(0, { validators: [CustomValidators.positive] }),

    // Inventory
    quantityInBox: fb.control(1, { validators: [Validators.min(1)] }),
    minOrderQuantity: fb.control(1, { validators: [Validators.required, Validators.min(1)] }),

    // Product Details
    unitOfMeasurement: fb.control<UnitOfMeasurement | null>(null),
    quantityUnit: fb.control<QuantityUnit>(QuantityUnit.PIECE),
    grade: fb.control<ProductGrade | null>(null),
    // Numbers only — the unit lives in `unitOfMeasurement`, and the two are
    // joined for display ("500" + Gram → "500g"). A unit typed in here would
    // show up twice.
    weight: fb.control('', { validators: [CustomValidators.numeric] }),
    // Optional: not every product has a list worth printing (a packaging
    // line, a bundle), and the admin should not have to invent one.
    ingredients: fb.control<string[]>([]),

    // Opt-in notification. Describes the save action, not the product, so it
    // is never seeded from the loaded product and resets with the form.
    notifyPriceChange: fb.control(false),
    notifyNewProduct: fb.control(false),

    // Features
    isFeatured: fb.control(false),
    isOrganic: fb.control(false),

    // Images
    images: fb.control<string[]>([]),
    image: fb.control(''),

    // Additional
    supplierReference: fb.control(''),
    certifications: fb.control<string[]>([]),

    /* No validators: a half-filled set is useful, and `dimensionsPayload`
       drops anything that is not a real measurement on the way out. */
    dimensions: fb.group({
      length: fb.control<number | null>(null),
      breadth: fb.control<number | null>(null),
      height: fb.control<number | null>(null),
      unit: fb.control<DimensionUnit | null>(DimensionUnit.CENTIMETRE),
    }),
  });
}
