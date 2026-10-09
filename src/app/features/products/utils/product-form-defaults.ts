import { ProductStatus, QuantityUnit } from '../models/product.model';

/** The blank "add product" form. Shared by the dialog's reset and its tests. */
export const PRODUCT_FORM_DEFAULTS: {
  status: ProductStatus;
  wholesale: number;
  retail: number;
  inBoxPrice: number;
  quantityInBox: number;
  minOrderQuantity: number;
  quantityUnit: QuantityUnit;
  isFeatured: boolean;
  isOrganic: boolean;
  notifyPriceChange: boolean;
  notifyNewProduct: boolean;
  ingredients: string[];
  certifications: string[];
  images: string[];
  image: string;
  costPrice: number;
} = {
  status: 'active',
  wholesale: 0,
  retail: 0,
  inBoxPrice: 0,
  quantityInBox: 1,
  minOrderQuantity: 1,
  quantityUnit: QuantityUnit.PIECE,
  isFeatured: false,
  isOrganic: false,
  notifyPriceChange: false,
  notifyNewProduct: false,
  ingredients: [],
  certifications: [],
  images: [],
  image: '',
  costPrice: 0,
};
