import { SaleLineItemDto } from '@features/sales/models/sale.model';
import { linePremium } from '@features/sales/utils/line-premium';

export const lineItemTotalPrice = (lineItem: SaleLineItemDto): number => {
  const quantity = lineItem.requestedQuantity;
  const price = lineItem.customPrice || lineItem.finalPrice || 0;

  return quantity * price;
};

/**
 * What a line's premium adds, if it carries one.
 *
 * Separate from the price so the two can be shown apart — the invoice
 * prints the premium on its own row — but both have to be in any figure
 * calling itself the total.
 */
export const lineItemPremium = (lineItem: SaleLineItemDto): number =>
  linePremium({
    quantity: lineItem.requestedQuantity,
    price: lineItem.customPrice || lineItem.finalPrice || 0,
    type: lineItem.premiumType,
    value: lineItem.premiumValue,
  });

/**
 * The goods plus their premiums.
 *
 * Premiums are in here deliberately. This feeds the "Total Amount" an admin
 * reads while building a sale, and the server adds premiums to the grand
 * total the customer is invoiced for — a figure on screen that left them out
 * would be quietly lower than the one that goes out the door.
 */
export const lineItemsTotalPrice = (lineItems: SaleLineItemDto[]): number => {
  return lineItems.reduce(
    (acc, lineItem) =>
      acc + lineItemTotalPrice(lineItem) + lineItemPremium(lineItem),
    0,
  );
};

/** Just the premiums, for showing what they come to on their own. */
export const lineItemsPremiumTotal = (lineItems: SaleLineItemDto[]): number =>
  lineItems.reduce((acc, lineItem) => acc + lineItemPremium(lineItem), 0);
