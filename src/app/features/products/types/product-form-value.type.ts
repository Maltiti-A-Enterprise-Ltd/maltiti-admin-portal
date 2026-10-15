// filepath: c:\Users\BilalAbubakari\Desktop\PROJECTS\maltiti-admin-portal\src\app\features\products\types\product-form-value.type.ts

import {
  DimensionUnit,
  ProductCategory,
  ProductGrade,
  ProductStatus,
  QuantityUnit,
  UnitOfMeasurement,
} from '../models/product.model';
import { FormControl, FormGroup } from '@angular/forms';

export interface ProductFormValue {
  name: string | null;
  sku: string | null;
  description: string | null;
  category: ProductCategory | null;
  status: ProductStatus | null;
  wholesale: number | null;
  retail: number | null;
  inBoxPrice: number | null;
  /** Whether the in-box price was set by hand rather than derived. */
  inBoxPriceOverride: boolean | null;
  costPrice: number | null;
  quantityInBox: number | null;
  minOrderQuantity: number | null;
  unitOfMeasurement: UnitOfMeasurement | null;
  quantityUnit: QuantityUnit | null;
  grade: ProductGrade | null;
  weight: string | null;
  ingredients: string[] | null;
  notifyPriceChange: boolean | null;
  notifyNewProduct: boolean | null;
  isFeatured: boolean | null;
  isOrganic: boolean | null;
  images: string[] | null;
  image: string | null;
  supplierReference: string | null;
  certifications: string[] | null;
  /**
   * Only meaningful for products sold in a container — see `hasDimensions`.
   * The group itself always exists; its measurements are what may be empty.
   */
  dimensions: {
    length: number | null;
    breadth: number | null;
    height: number | null;
    unit: DimensionUnit | null;
  };
}

export type ProductFormGroup = FormGroup<{
  name: FormControl<string | null>;
  sku: FormControl<string | null>;
  description: FormControl<string | null>;
  /* Was `string | null`, which disagreed with both the control it describes
     and `ProductFormValue.category` above. Nothing caught it while the form
     was built inline and its type inferred. */
  category: FormControl<ProductCategory | null>;
  status: FormControl<ProductStatus | null>;
  wholesale: FormControl<number | null>;
  retail: FormControl<number | null>;
  inBoxPrice: FormControl<number | null>;
  inBoxPriceOverride: FormControl<boolean | null>;
  costPrice: FormControl<number | null>;
  quantityInBox: FormControl<number | null>;
  minOrderQuantity: FormControl<number | null>;
  unitOfMeasurement: FormControl<UnitOfMeasurement | null>;
  quantityUnit: FormControl<QuantityUnit | null>;
  grade: FormControl<ProductGrade | null>;
  weight: FormControl<string | null>;
  ingredients: FormControl<string[] | null>;
  notifyPriceChange: FormControl<boolean | null>;
  notifyNewProduct: FormControl<boolean | null>;
  isFeatured: FormControl<boolean | null>;
  isOrganic: FormControl<boolean | null>;
  images: FormControl<string[] | null>;
  image: FormControl<string | null>;
  supplierReference: FormControl<string | null>;
  certifications: FormControl<string[] | null>;
  dimensions: FormGroup<{
    length: FormControl<number | null>;
    breadth: FormControl<number | null>;
    height: FormControl<number | null>;
    unit: FormControl<DimensionUnit | null>;
  }>;
}>;
