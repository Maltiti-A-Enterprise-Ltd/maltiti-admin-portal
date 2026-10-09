import { CreateProductDto, ProductStatus, UpdateProductDto } from '../models/product.model';
import { ProductFormValue } from '../types/product-form-value.type';
import { cleared } from './cleared';

/**
 * Turns the dialog's form into the payload the API expects.
 *
 * Optional fields go through `cleared`, which maps a blank to an explicit
 * `null`. Leaving one out would mean "unchanged" to the API rather than
 * "cleared" — TypeORM ignores `undefined` on save — so emptying a field in the
 * UI would silently do nothing.
 *
 * The notification flags are not set here: they describe the save rather than
 * the product, and which one applies depends on add vs. edit.
 */
export const buildProductPayload = (
  formValue: ProductFormValue,
): CreateProductDto | UpdateProductDto => ({
  name: formValue.name!,
  description: formValue.description!,
  category: formValue.category!,
  wholesale: formValue.wholesale!,
  retail: formValue.retail!,
  sku: cleared(formValue.sku),
  status: formValue.status as ProductStatus,
  unitOfMeasurement: cleared(formValue.unitOfMeasurement),
  // Not cleared: the column is NOT NULL and defaults to pieces.
  quantityUnit: formValue.quantityUnit || undefined,
  grade: cleared(formValue.grade),
  weight: cleared(formValue.weight),
  ingredients: formValue.ingredients || [],
  inBoxPrice: cleared(formValue.inBoxPrice),
  quantityInBox: cleared(formValue.quantityInBox),
  // Not cleared: the column is NOT NULL and defaults to 0.
  minOrderQuantity: formValue.minOrderQuantity || undefined,
  isFeatured: formValue.isFeatured || false,
  isOrganic: formValue.isOrganic || false,
  supplierReference: cleared(formValue.supplierReference),
  certifications: formValue.certifications || [],
  images: formValue.images || [],
  image: cleared(formValue.image),
  costPrice: cleared(formValue.costPrice),
});
