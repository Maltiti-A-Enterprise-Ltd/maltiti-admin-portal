import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { InvoiceCurrencyState } from './invoice-currency.state';
import { ExchangeRateApiService } from '../../services/exchange-rate-api.service';
import { ExchangeRateQuote, InvoiceCurrency } from '../../models/sale.model';

const quote = (currency: InvoiceCurrency, rate: number): ExchangeRateQuote => ({
  currency,
  rate,
  asOf: 'Sat, 10 Oct 2026 00:02:31 +0000',
  source: 'open.er-api.com',
});

describe('InvoiceCurrencyState', () => {
  let state: InvoiceCurrencyState;
  let getRate: jasmine.Spy;

  beforeEach(() => {
    getRate = jasmine.createSpy('getRate').and.callFake((currency: InvoiceCurrency) =>
      of(quote(currency, currency === InvoiceCurrency.USD ? 11.8125 : 8.2832)),
    );

    TestBed.configureTestingModule({
      providers: [
        InvoiceCurrencyState,
        { provide: ExchangeRateApiService, useValue: { getRate } },
      ],
    });

    state = TestBed.inject(InvoiceCurrencyState);
  });

  it('starts on cedis, with nothing to convert', () => {
    expect(state.currency()).toBe(InvoiceCurrency.GHS);
    expect(state.isForeign()).toBeFalse();
    expect(state.needsRate()).toBeFalse();
  });

  it("fetches today's rate when a foreign currency is chosen", () => {
    state.selectCurrency(InvoiceCurrency.USD);

    expect(getRate).toHaveBeenCalledWith(InvoiceCurrency.USD);
    expect(state.exchangeRate()).toBe(11.8125);
    expect(state.asOf()).toBeTruthy();
  });

  /**
   * The bug this guards: switching USD → CAD used to keep the USD rate,
   * invoicing in Canadian dollars at the American one. Wrong by 40%, and
   * entirely plausible-looking on the page.
   */
  it('never carries one currency’s rate over to another', () => {
    state.selectCurrency(InvoiceCurrency.USD);
    state.selectCurrency(InvoiceCurrency.CAD);

    expect(state.exchangeRate()).toBe(8.2832);
    expect(getRate).toHaveBeenCalledWith(InvoiceCurrency.CAD);
  });

  it('reopens a sale on the pair it was last invoiced at, without refetching', () => {
    state.reset(InvoiceCurrency.USD, 12.5);

    expect(state.currency()).toBe(InvoiceCurrency.USD);
    expect(state.exchangeRate()).toBe(12.5);
    expect(getRate).not.toHaveBeenCalled();
  });

  it('leaves an agreed rate alone when the currency is reselected', () => {
    state.reset(InvoiceCurrency.USD, 12.5);
    state.selectCurrency(InvoiceCurrency.USD);

    expect(state.exchangeRate()).toBe(12.5);
    expect(getRate).not.toHaveBeenCalled();
  });

  it('drops the rate entirely on the way back to cedis', () => {
    state.selectCurrency(InvoiceCurrency.USD);
    state.selectCurrency(InvoiceCurrency.GHS);

    expect(state.exchangeRate()).toBeNull();
    expect(state.payload()).toEqual({ currency: InvoiceCurrency.GHS });
  });

  describe('when the rate service cannot be reached', () => {
    beforeEach(() => {
      getRate.and.returnValue(throwError(() => new Error('503')));
    });

    // The fallback the feature was asked for: no invented number, just the
    // field and an explanation.
    it('asks the admin for a rate rather than guessing one', () => {
      state.selectCurrency(InvoiceCurrency.USD);

      expect(state.exchangeRate()).toBeNull();
      expect(state.error()).toContain('Enter the rate');
      expect(state.needsRate()).toBeTrue();
    });

    it('accepts the rate the admin types instead', () => {
      state.selectCurrency(InvoiceCurrency.USD);
      state.setRate(13.2);

      expect(state.needsRate()).toBeFalse();
      // No provenance: this rate is the admin's, not the feed's.
      expect(state.asOf()).toBeNull();
      expect(state.payload()).toEqual({
        currency: InvoiceCurrency.USD,
        exchangeRate: 13.2,
      });
    });
  });

  describe('regenerating the preview', () => {
    let settled: jasmine.Spy;

    beforeEach(() => {
      settled = jasmine.createSpy('onSettled');
      state.onSettled = settled;
    });

    it('fires once the currency and rate agree', () => {
      state.selectCurrency(InvoiceCurrency.USD);

      expect(settled).toHaveBeenCalledTimes(1);
    });

    // Generating now would convert at 1:1 and look like a working preview.
    it('does not fire while there is no rate to convert at', () => {
      getRate.and.returnValue(throwError(() => new Error('503')));

      state.selectCurrency(InvoiceCurrency.USD);

      expect(settled).not.toHaveBeenCalled();
    });

    it('does not fire when the rate is cleared', () => {
      state.reset(InvoiceCurrency.USD, 12.5);
      state.setRate(null);

      expect(settled).not.toHaveBeenCalled();
    });
  });
});
