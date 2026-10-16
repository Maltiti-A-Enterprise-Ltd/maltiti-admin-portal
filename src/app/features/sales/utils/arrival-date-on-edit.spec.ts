import { buildSaleUpdatePayload } from './sale-edit-lock';
import { arrivalDateForApi } from './arrival-date';
import { OrderStatus, PaymentStatus } from '../models/sale.model';

describe('arrivalDateForApi', () => {
  /* UTC midnight, so a date chosen in Accra does not land on the previous
     day for anyone reading it elsewhere. */
  it('sends the calendar day the admin picked, at UTC midnight', () => {
    const picked = new Date(2026, 10, 3, 17, 42);

    expect(arrivalDateForApi(picked)).toBe('2026-11-03T00:00:00.000Z');
  });

  /* An empty field removes the date rather than leaving it alone, so it
     has to be a null and not an omission. */
  it('is null for an empty field', () => {
    expect(arrivalDateForApi(null)).toBeNull();
    expect(arrivalDateForApi(undefined)).toBeNull();
  });
});

/**
 * The payload builder lists its fields by hand, so a field added to the
 * form and not to it never reaches the API. That has caught this codebase
 * out repeatedly, which is why this exists before anyone reports it.
 */
describe('the arrival date reaches the API from the edit form', () => {
  const build = (over: Record<string, unknown> = {}) =>
    buildSaleUpdatePayload({
      customerId: 'c1',
      orderStatus: OrderStatus.IN_TRANSIT,
      paymentStatus: PaymentStatus.PENDING_PAYMENT,
      deliveryFee: 0,
      lineItems: [],
      notifyCustomer: false,
      canEditContents: true,
      overriding: false,
      ...over,
    } as Parameters<typeof buildSaleUpdatePayload>[0]);

  it('sends a date that was picked', () => {
    expect(
      build({ estimatedArrivalDate: '2026-11-03T00:00:00.000Z' })
        .estimatedArrivalDate,
    ).toBe('2026-11-03T00:00:00.000Z');
  });

  it('sends null to remove one', () => {
    expect(build({ estimatedArrivalDate: null }).estimatedArrivalDate).toBeNull();
  });

  /* Omitted means "leave it alone". A sale that is not in transit never
     shows the field, so its stored date must not be touched. */
  it('omits the key entirely when the form did not offer the field', () => {
    expect('estimatedArrivalDate' in build()).toBeFalse();
  });

  /*
   * The decisive one. In-transit sales are locked — `canEditContents` is
   * false — and in transit is exactly when an arrival date needs
   * revising. If the date sat behind that lock the feature would be
   * unreachable from the form it was added to.
   */
  it('still sends the date on a locked, in-transit sale', () => {
    const payload = build({
      canEditContents: false,
      estimatedArrivalDate: '2026-11-03T00:00:00.000Z',
    });

    expect(payload.estimatedArrivalDate).toBe('2026-11-03T00:00:00.000Z');
    // ...while the things the lock exists for are still withheld.
    expect(payload.lineItems).toBeUndefined();
    expect(payload.deliveryFee).toBeUndefined();
  });
});
