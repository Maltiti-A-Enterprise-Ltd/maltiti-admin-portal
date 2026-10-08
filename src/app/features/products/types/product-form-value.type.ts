// filepath: c:\Users\BilalAbubakari\Desktop\PROJECTS\maltiti-admin-portal\src\app\features\products\types\product-form-value.type.ts

import {
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
  costPrice: number | null;
  quantityInBox: number | null;
  minOrderQuantity: number | null;
  unitOfMeasurement: UnitOfMeasurement | null;
  quantityUnit: QuantityUnit | null;
  grade: ProductGrade | null;
  weight: string | null;
  ingredients: string[] | null;
  notifyPriceChange: boolean | null;
  isFeatured: boolean | null;
  isOrganic: boolean | null;
  images: string[] | null;
  image: string | null;
  supplierReference: string | null;
  certifications: string[] | null;
}

export type ProductFormGroup = FormGroup<{
  name: FormControl<string | null>;
  sku: FormControl<string | null>;
  description: FormControl<string | null>;
  category: FormControl<string | null>;
  status: FormControl<ProductStatus | null>;
  wholesale: FormControl<number | null>;
  retail: FormControl<number | null>;
  inBoxPrice: FormControl<number | null>;
  costPrice: FormControl<number | null>;
  quantityInBox: FormControl<number | null>;
  minOrderQuantity: FormControl<number | null>;
  unitOfMeasurement: FormControl<UnitOfMeasurement | null>;
  quantityUnit: FormControl<QuantityUnit | null>;
  grade: FormControl<ProductGrade | null>;
  weight: FormControl<string | null>;
  ingredients: FormControl<string[] | null>;
  notifyPriceChange: FormControl<boolean | null>;
  isFeatured: FormControl<boolean | null>;
  isOrganic: FormControl<boolean | null>;
  images: FormControl<string[] | null>;
  image: FormControl<string | null>;
  supplierReference: FormControl<string | null>;
  certifications: FormControl<string[] | null>;
}>;
