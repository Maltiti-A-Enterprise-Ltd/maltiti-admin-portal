import { isWeightPartial, orderWeightLabel, weightCaveat } from './order-weight';

describe('orderWeightLabel', () => {
  it('writes the weight with its unit', () => {
    expect(orderWeightLabel({ totalWeightKg: 5.5 })).toBe('5.5 kg');
  });

  it('drops trailing zeros rather than padding to a fixed width', () => {
    expect(orderWeightLabel({ totalWeightKg: 12 })).toBe('12 kg');
  });

  it('keeps precision down to the gram', () => {
    expect(orderWeightLabel({ totalWeightKg: 0.125 })).toBe('0.125 kg');
  });

  it('groups thousands so a big shipment stays readable', () => {
    expect(orderWeightLabel({ totalWeightKg: 1250 })).toBe('1,250 kg');
  });

  /*
   * The API omits the figure rather than sending 0 when nothing could be
   * weighed, and the two mean different things: printing "0 kg" would tell an
   * admin the order weighs nothing.
   */
  it('shows a dash when the API sent no weight', () => {
    expect(orderWeightLabel({ totalWeightKg: undefined })).toBe('—');
  });

  it('shows a dash for a null weight too', () => {
    expect(orderWeightLabel({ totalWeightKg: null as unknown as number })).toBe('—');
  });

  // An order really can weigh nothing much; that is not the same as unknown.
  it('still prints a genuine zero', () => {
    expect(orderWeightLabel({ totalWeightKg: 0 })).toBe('0 kg');
  });
});

describe('isWeightPartial', () => {
  it('is false when every line was weighed', () => {
    expect(isWeightPartial({ unweighedLineItems: 0 })).toBe(false);
  });

  it('is false when the API said nothing about it', () => {
    expect(isWeightPartial({ unweighedLineItems: undefined })).toBe(false);
  });

  it('is true as soon as one line is missing', () => {
    expect(isWeightPartial({ unweighedLineItems: 1 })).toBe(true);
  });
});

describe('weightCaveat', () => {
  it('says nothing when the total is complete', () => {
    expect(weightCaveat({ unweighedLineItems: 0 })).toBe('');
  });

  it('agrees in number for a single item', () => {
    expect(weightCaveat({ unweighedLineItems: 1 })).toContain('1 item is not included');
  });

  it('agrees in number for several', () => {
    expect(weightCaveat({ unweighedLineItems: 3 })).toContain('3 items are not included');
  });

  /*
   * Both causes are named because the fix differs: a missing size is something
   * an admin can go and record, while a product sold by the litre cannot be
   * converted at all without a density nobody has written down.
   */
  it('names both reasons rather than guessing between them', () => {
    const caveat = weightCaveat({ unweighedLineItems: 2 });

    expect(caveat).toContain('no size recorded');
    expect(caveat).toContain('sold by volume');
  });

  it('tells the admin what to do about it', () => {
    expect(weightCaveat({ unweighedLineItems: 2 })).toContain('before quoting a courier');
  });
});
