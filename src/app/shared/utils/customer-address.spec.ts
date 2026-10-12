import { CustomerAddressSource, customerAddressLabel } from './customer-name';

/**
 * These mirror the backend's `customer-address.util.spec.ts`. The backend is
 * the authority — this exists because the sales form composes an address for a
 * customer that has not been saved onto a sale yet, and the two must agree or
 * the line changes the moment the sale is saved.
 */
describe('customerAddressLabel', () => {
  it('joins the four address columns in postal order', () => {
    expect(
      customerAddressLabel({
        address: '12 Gumani Road',
        city: 'Tamale',
        region: 'Northern',
        country: 'Ghana',
      }),
    ).toBe('12 Gumani Road, Tamale, Northern, Ghana');
  });

  it('leaves no empty slots when only the street is recorded', () => {
    expect(customerAddressLabel({ address: '12 Gumani Road' })).toBe('12 Gumani Road');
  });

  it('skips a missing middle column rather than leaving a gap', () => {
    expect(
      customerAddressLabel({ address: '12 Gumani Road', city: null, country: 'Ghana' }),
    ).toBe('12 Gumani Road, Ghana');
  });

  /*
   * Web checkout flattens country, region and city into `address` itself, so a
   * plain join gives back "Ghana, Northern, Tamale, Tamale, Northern, Ghana".
   */
  it('does not repeat a part already inside the address', () => {
    expect(
      customerAddressLabel({
        address: 'Ghana, Northern, Tamale, near the lorry station',
        city: 'Tamale',
        region: 'Northern',
        country: 'Ghana',
      }),
    ).toBe('Ghana, Northern, Tamale, near the lorry station');
  });

  it('matches a repeat regardless of how it was typed', () => {
    expect(
      customerAddressLabel({ address: 'Ghana, northern, TAMALE', city: 'Tamale' }),
    ).toBe('Ghana, northern, TAMALE');
  });

  it('still adds the parts the address does not already carry', () => {
    expect(
      customerAddressLabel({ address: 'Ghana, Northern', city: 'Tamale', country: 'Ghana' }),
    ).toBe('Ghana, Northern, Tamale');
  });

  it('trims whitespace around the parts it keeps', () => {
    expect(customerAddressLabel({ address: '  12 Gumani Road  ', city: ' Tamale ' })).toBe(
      '12 Gumani Road, Tamale',
    );
  });

  const emptyCases: [string, CustomerAddressSource | null | undefined][] = [
    ['nothing recorded', {}],
    ['null columns', { address: null, city: null }],
    ['blank columns', { address: '   ', city: '' }],
    ['no customer', null],
    ['an undefined customer', undefined],
  ];

  emptyCases.forEach(([label, customer]) => {
    it(`gives back an empty string for ${label}`, () => {
      expect(customerAddressLabel(customer)).toBe('');
    });
  });
});
