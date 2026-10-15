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
  BUCKET = 'bucket',
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

/**
 * What a product's dimensions are measured in.
 *
 * Centimetres for anything packed here. Inches because a freight forwarder
 * or an overseas buyer will quote a carton in them, and converting in your
 * head before typing is its own way to get a container load wrong.
 */
export enum DimensionUnit {
  CENTIMETRE = 'cm',
  INCH = 'in',
}

/**
 * How big one of whatever this product is sold in actually is.
 *
 * Deliberately not `boxLength` / `boxHeight` / `boxBreadth`: boxes prompted
 * it, but a drum has a diameter and no breadth. The product's own
 * `quantityUnit` says what these describe, so a new container is a new
 * optional field here and nothing else.
 *
 * Measurements are optional — a half-filled set is still useful. The unit is
 * not: numbers without one are ambiguous rather than incomplete.
 */
export interface ProductDimensions {
  length?: number;
  breadth?: number;
  height?: number;
  unit: DimensionUnit;
}

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
  dimensions?: ProductDimensions | null;
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
  | 'quantityInBox'
>;

/**
 * `| null` on the optional fields is deliberate: emptying one must be sent as
 * an explicit null. Leaving it out means "unchanged" to the API, not "cleared".
 */
export interface CreateProductDto {
  sku?: string | null;
  name: string;
  ingredients: string[];
  weight?: string | null;
  unitOfMeasurement?: UnitOfMeasurement | null;
  quantityUnit?: QuantityUnit;
  category: ProductCategory;
  description: string;
  status?: ProductStatus;
  images?: string[];
  image?: string | null;
  wholesale: number;
  retail: number;
  inBoxPrice?: number | null;
  quantityInBox?: number | null;
  /** Omitted leaves them alone; null clears them. */
  dimensions?: ProductDimensions | null;
  grade?: ProductGrade | null;
  isFeatured?: boolean;
  isOrganic?: boolean;
  certifications?: string[];
  supplierReference?: string | null;
  minOrderQuantity?: number;
  costPrice?: number | null;
  /**
   * Announce this product by email to every customer. Opt-in: a new product is
   * added silently unless this is true. Describes the save, not the product —
   * the API does not store it.
   */
  notifyNewProduct?: boolean;
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
