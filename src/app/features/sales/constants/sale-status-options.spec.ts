import {
  PAYMENT_STATUS_FILTER_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
} from './sale-status-options';
import { PaymentStatus } from '../models/sale.model';
import { getPaymentStatusSeverity, getStatusLabel } from '@shared/utils/sales.utils';

describe('payment status options', () => {
  const settable = (): PaymentStatus[] =>
    PAYMENT_STATUS_OPTIONS.map((option) => option.value);
  const filterable = (): (PaymentStatus | null)[] =>
    PAYMENT_STATUS_FILTER_OPTIONS.map((option) => option.value);

  /*
   * A deposit paid in cash leaves no payment record for the server to
   * derive anything from, so the sale sits on "pending payment" — which is
   * the exact thing this status was asked for. It has to be settable.
   */
  it('offers part payment as something to set by hand', () => {
    expect(settable()).toContain(PaymentStatus.PART_PAYMENT);
  });

  /* Between the two statuses it sits between, so the list still reads in
     the order a sale moves through it. */
  it('puts it after pending payment and before paid', () => {
    const order = settable();

    expect(order.indexOf(PaymentStatus.PART_PAYMENT)).toBeGreaterThan(
      order.indexOf(PaymentStatus.PENDING_PAYMENT),
    );
    expect(order.indexOf(PaymentStatus.PART_PAYMENT)).toBeLessThan(
      order.indexOf(PaymentStatus.PAID),
    );
  });

  /* Telling part-paid sales apart in the list is the other half of it. */
  it('offers part payment as something to filter by', () => {
    expect(filterable()).toContain(PaymentStatus.PART_PAYMENT);
  });

  it('keeps every settable status filterable too', () => {
    for (const status of settable()) {
      expect(filterable()).toContain(status);
    }
  });

  it('leads the filter with an all-statuses entry', () => {
    expect(PAYMENT_STATUS_FILTER_OPTIONS[0].value).toBeNull();
  });

  /* The two lists drifted apart before they were composed from one another.
     There is no longer any exception: the filter is the form's list plus
     "all", so a status cannot be filtered for and not set, or the reverse. */
  it('composes the filter from the settable list alone', () => {
    expect(PAYMENT_STATUS_FILTER_OPTIONS.length).toBe(
      PAYMENT_STATUS_OPTIONS.length + 1,
    );
  });

  /* Every status the API knows is offered. This is what would have caught
     part payment missing from the form in the first place. */
  it('offers every status the API declares', () => {
    for (const status of Object.values(PaymentStatus)) {
      expect(settable()).toContain(status);
    }
  });
});

describe('how part payment reads on screen', () => {
  it('is labelled in words rather than as a slug', () => {
    expect(getStatusLabel(PaymentStatus.PART_PAYMENT)).toBe('Part Payment');
  });

  /*
   * The point of the status is that it does not look like "pending
   * payment" at a glance, so the two must not share a severity.
   */
  it('does not look the same as pending payment', () => {
    expect(getPaymentStatusSeverity(PaymentStatus.PART_PAYMENT)).not.toBe(
      getPaymentStatusSeverity(PaymentStatus.PENDING_PAYMENT),
    );
  });

  it('does not look the same as paid either', () => {
    expect(getPaymentStatusSeverity(PaymentStatus.PART_PAYMENT)).not.toBe(
      getPaymentStatusSeverity(PaymentStatus.PAID),
    );
  });
});
