import {
  LightProduct,
  Product,
  ProductCategory,
  ProductGrade,
} from '@features/products/models/product.model';
import { unitSymbols } from '@shared/constants';

/**
 * Categories where the grade is part of how the product is identified rather
 * than an attribute of it. Shea butter is bought and priced by grade, so a
 * label that omits it does not say which product is meant.
 */
const GRADE_IN_NAME_CATEGORIES: ReadonlySet<ProductCategory> = new Set<ProductCategory>([
  'Shea Butter',
]);

/** "Grade A" reads naturally; "Grade premium" does not. */
const GRADE_LABELS: Record<ProductGrade, string> = {
  A: 'Grade A',
  B: 'Grade B',
  premium: 'Premium',
  standard: 'Standard',
  organic: 'Organic',
};

type NameSource = Partial<Pick<Product, 'grade' | 'category'>>;

/**
 * The product's grade, for categories identified by it. Empty for every other
 * category, and when the grade has not been recorded.
 */
export const productGradeLabel = (product: NameSource | null | undefined): string => {
  const grade = product?.grade;
  const category = product?.category;

  if (!grade || !category || !GRADE_IN_NAME_CATEGORIES.has(category)) {
    return '';
  }

  return GRADE_LABELS[grade] ?? '';
};

/**
 * A product's display label, e.g. `"Shea Butter (Grade A, 500g)"`, dropping
 * whichever parts the product does not have.
 */
export const productName = (
  product: (Product | LightProduct) | null | undefined,
): string => {
  if (!product) {
    return 'N/A';
  }

  const { name, weight, unitOfMeasurement } = product;

  const size =
    weight && unitOfMeasurement
      ? `${weight}${unitSymbols[unitOfMeasurement] || unitOfMeasurement}`
      : '';

  const suffix = [productGradeLabel(product), size].filter(Boolean).join(', ');

  return suffix ? `${name} (${suffix})` : name;
};
