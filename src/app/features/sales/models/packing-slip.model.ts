/**
 * The packing slip request, kept out of `sale.model.ts`, which is already at
 * its length limit.
 */

/** One line's quantity for a part shipment. */
export interface PackingSlipLineQuantity {
  /** Position in the sale's line items — they have no id of their own. */
  index: number;
  /** What we expect to find there. The API checks it rather than trusting it. */
  productId: string;
  quantity: number;
}

/** Body for POST /sales/:id/packing-slip. Everything is optional. */
export interface GeneratePackingSlipDto {
  /** How many parcels it went out in. Omitted, the slip has a blank to fill in. */
  packageCount?: number;
  /** Printed under the items, e.g. handling instructions. Max 500 characters. */
  notes?: string;
  /** Show weights in pounds beside kilograms. */
  showImperialWeights?: boolean;
  /** Quantities for a part shipment. Only lines that differ from the order. */
  lineQuantities?: PackingSlipLineQuantity[];
}
