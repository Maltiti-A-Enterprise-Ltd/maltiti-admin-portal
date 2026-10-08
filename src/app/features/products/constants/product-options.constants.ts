/**
 * Product Constants
 * Contains all option arrays and constants used across product-related components
 */

// Product Categories
export const PRODUCT_CATEGORIES = [
  { label: 'Shea Butter', value: 'Shea Butter' },
  { label: 'Black Soap', value: 'Black Soap' },
  { label: 'Cosmetics', value: 'Cosmetics' },
  { label: 'Shea Soap', value: 'Shea Soap' },
  { label: 'Powdered Soap', value: 'Powdered Soap' },
  { label: 'Dawadawa', value: 'Dawadawa' },
  { label: 'Essential Oils', value: 'Essential Oils' },
  { label: 'Hair Oil', value: 'Hair Oil' },
  { label: 'Grains', value: 'Grains' },
  { label: 'Legumes', value: 'Legumes' },
  { label: 'Other', value: 'Other' },
];

// Product Status Options
export const PRODUCT_STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Out of Stock', value: 'out_of_stock' },
  { label: 'Discontinued', value: 'discontinued' },
];

// Product Grade Options
export const PRODUCT_GRADE_OPTIONS = [
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'Premium', value: 'premium' },
  { label: 'Standard', value: 'standard' },
  { label: 'Organic', value: 'organic' },
];

// Unit of Measurement Options
export const UNIT_OF_MEASUREMENT_OPTIONS = [
  { label: 'Kilogram', value: 'kilogram' },
  { label: 'Gram', value: 'gram' },
  { label: 'Pound', value: 'pound' },
  { label: 'Litre', value: 'litre' },
  { label: 'Millilitre', value: 'millilitre' },
];

// How a product is counted when sold. Separate from unit of measurement, which
// describes how much product is inside one of these.
export const QUANTITY_UNIT_OPTIONS = [
  { label: 'Pieces', value: 'piece' },
  { label: 'Boxes', value: 'box' },
  { label: 'Cartons', value: 'carton' },
  { label: 'Bags', value: 'bag' },
  { label: 'Sachets', value: 'sachet' },
  { label: 'Bottles', value: 'bottle' },
  { label: 'Gallons', value: 'gallon' },
  { label: 'Jerry Cans', value: 'jerry_can' },
  { label: 'Jars', value: 'jar' },
  { label: 'Tubs', value: 'tub' },
  { label: 'Drums', value: 'drum' },
  { label: 'Kegs', value: 'keg' },
  { label: 'Pallets', value: 'pallet' },
];

// Ingredient Options
export const INGREDIENT_OPTIONS = [
  'Shea Butter',
  'Black Soap',
  'Essential Oils',
  'Herbs',
  'Natural Extracts',
  'Vegetable Oil',
  'Coconut Oil',
  'Palm Oil',
  'Aloe Vera',
  'Honey',
  'Lemon',
  'Ginger',
  'Turmeric',
  'Other',
];

// Certification Options
export const CERTIFICATION_OPTIONS = [
  'Organic Certified',
  'Fair Trade',
  'Vegan',
  'Cruelty Free',
  'Halal',
  'Kosher',
  'ISO 9001',
  'GMP Certified',
];

// Type exports for better TypeScript support
export type ProductCategoryOption = (typeof PRODUCT_CATEGORIES)[number];
export type ProductStatusOption = (typeof PRODUCT_STATUS_OPTIONS)[number];
export type ProductGradeOption = (typeof PRODUCT_GRADE_OPTIONS)[number];
export type UnitOfMeasurementOption = (typeof UNIT_OF_MEASUREMENT_OPTIONS)[number];
export type QuantityUnitOption = (typeof QUANTITY_UNIT_OPTIONS)[number];
export type IngredientOption = (typeof INGREDIENT_OPTIONS)[number];
export type CertificationOption = (typeof CERTIFICATION_OPTIONS)[number];
