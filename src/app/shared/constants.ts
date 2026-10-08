import { UnitOfMeasurement } from '@features/products/models/product.model';

export const SERVER_ERROR = 'Something went wrong. Please try again later.';

export const unitSymbols: Record<UnitOfMeasurement, string> = {
  [UnitOfMeasurement.KILOGRAM]: 'kg',
  [UnitOfMeasurement.GRAM]: 'g',
  [UnitOfMeasurement.POUND]: 'lb',
  [UnitOfMeasurement.LITRE]: 'L',
  [UnitOfMeasurement.MILLILITRE]: 'ml',
};
