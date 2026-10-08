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

/**
 * How a product is counted when sold — the thing a quantity of 11 is eleven
 * *of*. Distinct from UnitOfMeasurement, which says how much is inside one.
 */
export enum QuantityUnit {
  PIECE = 'piece',
  BOX = 'box',
  CARTON = 'carton',
  BAG = 'bag',
  SACHET = 'sachet',
  BOTTLE = 'bottle',
  GALLON = 'gallon',
  JERRY_CAN = 'jerry_can',
  JAR = 'jar',
  TUB = 'tub',
  DRUM = 'drum',
  KEG = 'keg',
  PALLET = 'pallet',
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
  quantityUnit: QuantityUnit;
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
  | 'id'
  | 'name'
  | 'wholesale'
  | 'retail'
  | 'unitOfMeasurement'
  | 'weight'
  | 'quantityUnit'
  | 'grade'
  | 'category'
>;

export interface CreateProductDto {
  sku?: string;
  name: string;
  ingredients: string[];
  weight?: string;
  unitOfMeasurement?: UnitOfMeasurement;
  quantityUnit?: QuantityUnit;
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

export type UpdateProductDto = Partial<CreateProductDto> & {
  /**
   * Email every customer the old and new prices. Opt-in: price edits are silent
   * unless this is true, and it is ignored when no price actually changed.
   * Describes the save, not the product — the API does not store it.
   */
  notifyPriceChange?: boolean;
};

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
