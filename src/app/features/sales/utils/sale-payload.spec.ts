import {
  buildSaleCreatePayload,
  buildSaleUpdatePayload,
} from './sale-edit-lock';
import {
  OrderStatus,
  PaymentInstructionType,
  PaymentStatus,
  PremiumType,
  SaleLineItemDto,
} from '../models/sale.model';

/**
 * Both builders list their fields by hand, so anything not named in them
 * never reaches the API however well it works everywhere else.
 *
 * That is not hypothetical: the premium fields were added to the line
 * editor and to every calculation, and omitted here — so they were
 * collected in the form, shown on screen, and silently dropped on the way
 * out. These tests exist so the next field added cannot do the same.
 */
describe('sale payloads carry what the form collected', () => {
  const line = (over: Partial<SaleLineItemDto> = {}): SaleLineItemDto =>
    ({
      productId: 'p1',
      requestedQuantity: 10,
      batchAllocations: [],
      finalPrice: 100,
      ...over,
    }) as SaleLineItemDto;

  const common = {
    customerId: 'c1',
    orderStatus: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING_PAYMENT,
    deliveryFee: 0,
    notifyCustomer: false,
  };

  const update = (over: Record<string, unknown> = {}) =>
    buildSaleUpdatePayload({
      ...common,
      lineItems: [line()],
      canEditContents: true,
      overriding: false,
      ...over,
    } as Parameters<typeof buildSaleUpdatePayload>[0]);

  const create = (over: Record<string, unknown> = {}) =>
    buildSaleCreatePayload({
      ...common,
      lineItems: [line()],
      ...over,
    } as Parameters<typeof buildSaleCreatePayload>[0]);

  describe('line item premiums', () => {
    const withPremium = [
      line({ premiumType: PremiumType.AMOUNT, premiumValue: 50 }),
    ];

    it('sends the premium when creating', () => {
      expect(create({ lineItems: withPremium }).lineItems[0]).toEqual(
        jasmine.objectContaining({
          premiumType: PremiumType.AMOUNT,
          premiumValue: 50,
        }),
      );
    });

    /* Editing a sale used to strip its premiums entirely. */
    it('sends the premium when editing', () => {
      expect(update({ lineItems: withPremium }).lineItems?.[0]).toEqual(
        jasmine.objectContaining({
          premiumType: PremiumType.AMOUNT,
          premiumValue: 50,
        }),
      );
    });

    /* Half a premium is rejected by the API, so neither half is sent. */
    it('sends neither half when only one is set', () => {
      const partial = [line({ premiumType: PremiumType.PERCENT })];
      const sent = create({ lineItems: partial }).lineItems[0];

      expect('premiumType' in sent).toBeFalse();
      expect('premiumValue' in sent).toBeFalse();
    });

    it('leaves an ordinary line without premium keys at all', () => {
      const sent = create().lineItems[0];

      expect('premiumType' in sent).toBeFalse();
    });
  });

  describe('payment terms', () => {
    const terms = [
      { type: PaymentInstructionType.INITIAL_DEPOSIT, percentage: 50 },
    ];

    it('sends the instructions and remarks when creating', () => {
      const sent = create({
        paymentInstructions: terms,
        invoiceRemarks: 'Prices held for 30 days.',
      });

      expect(sent.paymentInstructions).toEqual(terms);
      expect(sent.invoiceRemarks).toBe('Prices held for 30 days.');
    });

    it('sends them when editing', () => {
      const sent = update({
        paymentInstructions: terms,
        invoiceRemarks: 'A remark.',
      });

      expect(sent.paymentInstructions).toEqual(terms);
      expect(sent.invoiceRemarks).toBe('A remark.');
    });

    /* An empty array is how terms are removed. Omitting the key would mean
       "unchanged" and leave the stored ones in place. */
    it('sends an empty array rather than omitting it', () => {
      expect(create().paymentInstructions).toEqual([]);
      expect(update().paymentInstructions).toEqual([]);
    });

    it('sends null remarks rather than omitting them', () => {
      expect(create().invoiceRemarks).toBeNull();
      expect(update().invoiceRemarks).toBeNull();
    });

    /* Terms are what the customer agreed to pay, so they sit behind the
       same lock as the line items rather than being editable on a sale
       that has already gone out. */
    it('withholds them on a locked sale, with the line items', () => {
      const sent = update({
        canEditContents: false,
        paymentInstructions: terms,
        invoiceRemarks: 'A remark.',
      });

      expect(sent.paymentInstructions).toBeUndefined();
      expect(sent.invoiceRemarks).toBeUndefined();
      expect(sent.lineItems).toBeUndefined();
    });
  });

  /* An edit that also records a payment leaves the status to the API, which
     re-derives it from the ledger. The key has to be absent rather than
     undefined — present-and-undefined would still read as an instruction. */
  describe('payment status on an edit that settles the sale', () => {
    it('omits the key entirely when no status is given', () => {
      const sent = update({ paymentStatus: undefined });

      expect('paymentStatus' in sent).toBe(false);
    });

    it('still sends it on an ordinary edit', () => {
      expect(update().paymentStatus).toBe(PaymentStatus.PENDING_PAYMENT);
    });
  });
});
