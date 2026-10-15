import { buildSaleUpdatePayload } from './sale-edit-lock';
import { lineItemsTotalPrice } from '@shared/utils/totalPriceCalculator';
import {
  OrderStatus,
  PaymentStatus,
  PremiumType,
  Sale,
  SaleLineItem,
  SaleLineItemDto,
} from '../models/sale.model';

/**
 * A premium has to survive being read back and saved again.
 *
 * It is dropped by any step that rebuilds a line item field by field, and
 * there are several: the API's response mapper, the sale form's
 * `populateForm`, and both payload builders. Each was written before
 * premiums existed, and each silently omitted them.
 *
 * These cover the two portal-side steps together, because the failure
 * only shows up across them — read a sale, save it unchanged, and the
 * premium should still be there.
 */
describe('a premium survives a read-then-save', () => {
  /** What the API returns for a line carrying a premium. */
  const fromApi = (): SaleLineItem =>
    ({
      id: 'l1',
      productId: 'p1',
      requestedQuantity: 10,
      batchAllocations: [],
      customPrice: 100,
      finalPrice: 100,
      premiumType: PremiumType.AMOUNT,
      premiumValue: 50,
      premiumAmount: 500,
      totalPrice: 1000,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }) as SaleLineItem;

  /** What `populateForm` puts into the form array, field by field. */
  const seedIntoForm = (item: SaleLineItem): SaleLineItemDto => ({
    productId: item.productId,
    requestedQuantity: item.requestedQuantity,
    batchAllocations: item.batchAllocations || [],
    customPrice: item.customPrice,
    finalPrice: Number(item.finalPrice),
    premiumType: item.premiumType ?? null,
    premiumValue: item.premiumValue ?? null,
  });

  const saved = (line: SaleLineItemDto): SaleLineItemDto =>
    buildSaleUpdatePayload({
      customerId: 'c1',
      orderStatus: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING_PAYMENT,
      deliveryFee: 0,
      lineItems: [line],
      notifyCustomer: false,
      canEditContents: true,
      overriding: false,
    }).lineItems![0] as SaleLineItemDto;

  it('keeps the premium when a sale is opened and saved again', () => {
    const sent = saved(seedIntoForm(fromApi()));

    expect(sent.premiumType).toBe(PremiumType.AMOUNT);
    expect(sent.premiumValue).toBe(50);
  });

  /* The sales list adds its Total column up from the line items the API
     returned, so the premium has to be on them or the total is short. */
  it('counts the premium in the total computed from the API response', () => {
    const total = lineItemsTotalPrice([
      fromApi() as unknown as SaleLineItemDto,
    ]);

    expect(total).toBe(1500);
  });

  /* The shape the API used to return: no premium fields at all. The total
     was short by exactly the premium, which is what was reported. */
  it('is short when the API omits the premium, as it did', () => {
    const withoutPremium = {
      ...fromApi(),
      premiumType: undefined,
      premiumValue: undefined,
      premiumAmount: undefined,
    };

    expect(
      lineItemsTotalPrice([withoutPremium as unknown as SaleLineItemDto]),
    ).toBe(1000);
  });

  it('leaves an ordinary line alone through the same round trip', () => {
    const plain = { ...fromApi(), premiumType: null, premiumValue: null };
    const sent = saved(seedIntoForm(plain as SaleLineItem));

    expect('premiumType' in sent).toBeFalse();
    expect(lineItemsTotalPrice([sent])).toBe(1000);
  });
});
