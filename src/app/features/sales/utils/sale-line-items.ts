import { SaleLineItemDto } from '../models/sale.model';

/**
 * The line items as the API wants them: only the fields a sale is built from,
 * dropping whatever the editor carries for its own use.
 *
 * `customPrice` collapses to `undefined` when unset, so the API falls back to
 * the product's own price rather than being told the line costs nothing.
 */
export const toLineItemPayload = (
  items: readonly SaleLineItemDto[],
): SaleLineItemDto[] =>
  items.map((item) => ({
    productId: item.productId,
    requestedQuantity: item.requestedQuantity,
    batchAllocations: item.batchAllocations,
    customPrice: item.customPrice || undefined,
  }));
