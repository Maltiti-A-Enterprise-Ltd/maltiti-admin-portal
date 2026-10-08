/**
 * Product domain models based on Swagger API documentation
 * These models represent the Product entity and its related DTOs
 */
import { Ingredient } from '@models/ingredient.model';

export enum UnitOfMeasurement {
  KILOGRAM = 'kilogram',
  GRAM = 'gram',
  POUND = 'pound',
  LITRE = 'litre',
  MILLILITRE = 'millilitre',
}

export type ProductCategory =
  | 'Shea Butter'
  | 'Black Soap'
  | 'Cosmetics'
  | 'Shea Soap'
  | 'Powdered Soap'
  | 'Dawadawa'
  | 'Essential Oils'
  | 'Grains'
  | 'Legumes'
  | 'Other';

export type ProductStatus = 'active' | 'inactive' | 'out_of_stock' | 'discontinued';

export type ProductGrade = 'A' | 'B' | 'premium' | 'standard' | 'organic';

export interface Product {
  id: string;
  sku: string;
  name: string;
  ingredients: Ingredient[];
  weight: string;
  unitOfMeasurement: UnitOfMeasurement;
  category: ProductCategory;
  description: string;
  status: ProductStatus;
  images: string[];
  image: string;
  wholesale: number;
  retail: number;
  inBoxPrice: number;
  quantityInBox: number;
  favorite: boolean;
  rating: number;
  reviews: number;
  grade: ProductGrade;
  isFeatured: boolean;
  isOrganic: boolean;
  certifications: string[];
  supplierReference: string;
  minOrderQuantity: number;
  costPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export type LightProduct = Pick<
  Product,
  'id' | 'name' | 'wholesale' | 'retail' | 'unitOfMeasurement' | 'weight'
>;

export interface CreateProductDto {
  sku?: string;
  name: string;
  ingredients: string[];
  weight?: string;
  unitOfMeasurement?: UnitOfMeasurement;
  category: ProductCategory;
  description: string;
  status?: ProductStatus;
  images?: string[];
  image?: string;
  wholesale: number;
  retail: number;
  inBoxPrice?: number;
  quantityInBox?: number;
  grade?: ProductGrade;
  isFeatured?: boolean;
  isOrganic?: boolean;
  certifications?: string[];
  supplierReference?: string;
  minOrderQuantity?: number;
  costPrice?: number;
}

export type UpdateProductDto = Partial<CreateProductDto>;

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  category?: ProductCategory;
  status?: ProductStatus;
  grade?: ProductGrade;
  unitOfMeasurement?: UnitOfMeasurement;
  isFeatured?: boolean;
  isOrganic?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'name' | 'retail' | 'createdAt' | 'rating';
  sortOrder?: 'ASC' | 'DESC';
}

export interface BestProductsResponse {
  totalItems: number;
  data: Product[];
}
