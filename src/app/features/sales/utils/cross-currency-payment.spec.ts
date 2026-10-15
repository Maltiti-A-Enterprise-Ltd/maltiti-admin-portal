import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { InvoiceCurrency } from '../models/sale.model';
import { CrossCurrencyPayment } from './cross-currency-payment';

const build = (
  saleCurrency: InvoiceCurrency | undefined,
  picked: InvoiceCurrency | null = null,
  amount: number | null = null,
  rate: number | null = null,
): CrossCurrencyPayment =>
  // `toSignal` inside needs one; the component gets it from being a field
  // initializer, so the test has to supply its own.
  TestBed.runInInjectionContext(
    () =>
      new CrossCurrencyPayment(
        new FormControl<InvoiceCurrency | null>(picked),
        new FormControl<number | null>(amount),
        new FormControl<number | null>(rate),
        signal(saleCurrency),
      ),
  );

describe('CrossCurrencyPayment', () => {
  describe('when it applies', () => {
    it('does not apply until a currency is picked', () => {
      expect(build(InvoiceCurrency.GHS).isCrossCurrency()).toBe(false);
    });

    /* Picking the sale's own currency is the ordinary case said out loud,
       not a conversion — demanding a rate for it would be a pointless
       field to fill in. */
    it('does not apply when the money is the sale’s own', () => {
      expect(
        build(InvoiceCurrency.GHS, InvoiceCurrency.GHS).isCrossCurrency(),
      ).toBe(false);
    });

    it('applies once a different currency is picked', () => {
      expect(
        build(InvoiceCurrency.GHS, InvoiceCurrency.USD).isCrossCurrency(),
      ).toBe(true);
    });

    /* A sale loaded before its currency arrives, and every sale that
       predates the column, behaves as cedis. */
    it('treats an unknown sale currency as cedis', () => {
      expect(build(undefined, InvoiceCurrency.GHS).isCrossCurrency()).toBe(false);
      expect(build(undefined, InvoiceCurrency.USD).isCrossCurrency()).toBe(true);
    });

    it('applies between two foreign currencies', () => {
      expect(
        build(InvoiceCurrency.CAD, InvoiceCurrency.USD).isCrossCurrency(),
      ).toBe(true);
    });
  });

  describe('what it settles', () => {
    it('multiplies what arrived by the rate', () => {
      expect(
        build(InvoiceCurrency.GHS, InvoiceCurrency.USD, 500, 12.4).settled(),
      ).toBe(6200);
    });

    it('rounds to the pesewa', () => {
      expect(
        build(InvoiceCurrency.GHS, InvoiceCurrency.USD, 100, 12.345).settled(),
      ).toBe(1234.5);
    });

    /* A half-filled conversion has no answer, and a figure derived from one
       of the two would be worse than none. */
    const incomplete: [string, number | null, number | null][] = [
      ['no amount', null, 12.4],
      ['no rate', 500, null],
      ['a zero amount', 0, 12.4],
      ['a zero rate', 500, 0],
    ];

    incomplete.forEach(([label, amount, rate]) => {
      it(`shows nothing with ${label}`, () => {
        expect(
          build(InvoiceCurrency.GHS, InvoiceCurrency.USD, amount, rate).settled(),
        ).toBeNull();
      });
    });

    it('shows nothing when no conversion is happening', () => {
      expect(
        build(InvoiceCurrency.GHS, InvoiceCurrency.GHS, 500, 12.4).settled(),
      ).toBeNull();
    });
  });

  it('offers every currency', () => {
    expect(build(InvoiceCurrency.GHS).options.map((o) => o.value)).toEqual(
      Object.values(InvoiceCurrency),
    );
  });
});
