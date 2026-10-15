import {
  DERIVED_PAYMENT_STATUS_OPTIONS,
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
   * Part payment is derived from the confirmed payments against the total.
   * Offering it in the form would invite someone to set a status the next
   * payment edit silently overwrites.
   */
  it('does not offer part payment as something to set by hand', () => {
    expect(settable()).not.toContain(PaymentStatus.PART_PAYMENT);
  });

  /* Telling part-paid sales apart is the whole point, so it has to be
     filterable even though it is not settable. */
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

  /* The two lists drifted apart before they were composed from one another;
     the derived list is the one deliberate exception. */
  it('composes the filter from the settable and derived lists', () => {
    expect(PAYMENT_STATUS_FILTER_OPTIONS.length).toBe(
      PAYMENT_STATUS_OPTIONS.length + DERIVED_PAYMENT_STATUS_OPTIONS.length + 1,
    );
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
