import { CreateProductDto, ProductStatus, UpdateProductDto } from '../models/product.model';
import { ProductFormValue } from '../types/product-form-value.type';

/**
 * Maps the product dialog's form value onto the API payload.
 *
 * Only the fields the product itself owns — the notification flags are added by
 * the caller, because each belongs to exactly one of create or update and the
 * API rejects properties the matching DTO does not declare.
 */
export const buildProductPayload = (
  formValue: ProductFormValue,
): CreateProductDto | UpdateProductDto => ({
  name: formValue.name!,
  description: formValue.description!,
  category: formValue.category!,
  wholesale: formValue.wholesale!,
  retail: formValue.retail!,
  sku: formValue.sku || undefined,
  status: formValue.status as ProductStatus,
  unitOfMeasurement: formValue.unitOfMeasurement || undefined,
  quantityUnit: formValue.quantityUnit || undefined,
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
});
