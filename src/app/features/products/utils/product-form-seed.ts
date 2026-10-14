import { Product } from '../models/product.model';
import { ProductFormValue } from '../types/product-form-value.type';

/**
 * The values the product dialog's form opens on for an existing product.
 *
 * Used both for editing a product and for starting a new one from it. The two
 * differ in one place — a copy cannot inherit the original's SKU — and in what
 * the dialog does with the result on save.
 *
 * Only form fields are listed. Spreading the whole product would work, since
 * `patchValue` ignores keys the form does not have, but it also quietly carries
 * `id`, `createdAt` and friends into a copy's starting values.
 */
export function productFormSeed(
  product: Product,
  options: { duplicate: boolean } = { duplicate: false },
): Partial<ProductFormValue> {
  return {
    name: product.name,
    /* A SKU names one product. A copy that inherited it would be rejected
       outright on save, so it starts blank for a new one to be typed or left
       to be assigned. */
    sku: options.duplicate ? '' : product.sku,
    description: product.description,
    category: product.category,
    status: product.status,

    wholesale: product.wholesale,
    retail: product.retail,
    inBoxPrice: product.inBoxPrice,
    // Optional, and absent means "not recorded" rather than free.
    costPrice: product.costPrice ?? null,

    quantityInBox: product.quantityInBox,
    minOrderQuantity: product.minOrderQuantity || 1,

    unitOfMeasurement: product.unitOfMeasurement,
    quantityUnit: product.quantityUnit,
    grade: product.grade,
    weight: product.weight,

    /* These controls are typed as arrays, but the API returns null for an
       empty list. Letting null through makes anything that reads them as
       arrays throw. */
    ingredients: (product.ingredients ?? []).map(({ id }) => id),
    certifications: product.certifications ?? [],
    images: product.images ?? [],
    image: product.image,

    isFeatured: product.isFeatured,
    isOrganic: product.isOrganic,
    supplierReference: product.supplierReference,
  };
}
