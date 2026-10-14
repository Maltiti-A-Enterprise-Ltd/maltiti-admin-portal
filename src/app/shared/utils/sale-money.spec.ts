import { InvoiceCurrency } from '@features/sales/models/sale.model';
import {
  currencySymbol,
  formatSaleAmount,
  ghsEquivalent,
  isBaseCurrency,
  saleCurrency,
} from './sale-money';

describe('saleCurrency', () => {
  it('reads the sale’s own currency', () => {
    expect(saleCurrency({ currency: InvoiceCurrency.CAD })).toBe(InvoiceCurrency.CAD);
  });

  /* Every sale that predates the column, and anything still loading, is a
     cedi sale — which is what it always was. */
  const missing: [string, unknown][] = [
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['something unrecognised', 'XYZ'],
  ];

  missing.forEach(([label, currency]) => {
    it(`falls back to cedis for ${label}`, () => {
      expect(saleCurrency({ currency: currency as string })).toBe(InvoiceCurrency.GHS);
      expect(isBaseCurrency({ currency: currency as string })).toBe(true);
    });
  });

  it('falls back to cedis with no sale at all', () => {
    expect(saleCurrency(null)).toBe(InvoiceCurrency.GHS);
  });
});

describe('currencySymbol', () => {
  /* Cedis keep the sign they have always had. The others use their code: a
     bare "$" would not say whether it is US or Canadian, and that is the
     distinction this exists to preserve. */
  const symbols: [InvoiceCurrency, string][] = [
    [InvoiceCurrency.GHS, 'GH₵'],
    [InvoiceCurrency.USD, 'USD'],
    [InvoiceCurrency.CAD, 'CAD'],
  ];

  symbols.forEach(([currency, symbol]) => {
    it(`shows ${currency} as "${symbol}"`, () => {
      expect(currencySymbol({ currency })).toBe(symbol);
    });
  });
});

describe('formatSaleAmount', () => {
  it('puts the sale’s currency in front of the amount', () => {
    expect(formatSaleAmount(5000, { currency: InvoiceCurrency.CAD })).toBe('CAD 5,000.00');
  });

  it('keeps the cedi sign for an ordinary sale', () => {
    expect(formatSaleAmount(1234.5, { currency: InvoiceCurrency.GHS })).toBe('GH₵ 1,234.50');
  });

  /* A price rendering as "5,000" beside one rendering as "4,999.50" makes a
     column impossible to scan. */
  it('always shows two decimals', () => {
    expect(formatSaleAmount(7, null)).toBe('GH₵ 7.00');
  });

  const nothing: [string, unknown][] = [
    ['null', null],
    ['undefined', undefined],
    ['a non-numeric amount', 'lots'],
  ];

  nothing.forEach(([label, amount]) => {
    it(`renders ${label} as zero rather than NaN`, () => {
      expect(formatSaleAmount(amount as number, null)).toBe('GH₵ 0.00');
    });
  });

  /* Postgres hands decimals back as strings, so this is the ordinary case. */
  it('copes with a numeric string', () => {
    expect(formatSaleAmount('250.5', { currency: InvoiceCurrency.USD })).toBe('USD 250.50');
  });
});

describe('ghsEquivalent', () => {
  it('restates a foreign amount for the reader', () => {
    expect(ghsEquivalent(57500, { currency: InvoiceCurrency.CAD })).toBe('≈ GH₵ 57,500.00');
  });

  /* Restating a cedi sale in cedis is noise. */
  it('says nothing for a cedi sale', () => {
    expect(ghsEquivalent(5000, { currency: InvoiceCurrency.GHS })).toBeNull();
  });

  const absent: [string, unknown][] = [
    ['null', null],
    ['undefined', undefined],
  ];

  absent.forEach(([label, amount]) => {
    it(`says nothing when the cedi figure is ${label}`, () => {
      expect(ghsEquivalent(amount as number, { currency: InvoiceCurrency.CAD })).toBeNull();
    });
  });
});
