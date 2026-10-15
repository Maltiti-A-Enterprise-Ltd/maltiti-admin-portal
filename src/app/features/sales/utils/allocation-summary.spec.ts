import { allocationSummary } from './allocation-summary';

describe('allocationSummary', () => {
  it('names the shortfall when only part of the line is batch-tracked', () => {
    expect(allocationSummary(3, 5)).toBe('Allocated: 3 / 5 (2 remaining)');
  });

  /* Over-allocation is the one thing here that is actually wrong, so it says
     so rather than leaving a reader to notice 7 is bigger than 5. */
  it('calls out an over-allocation in words', () => {
    expect(allocationSummary(7, 5)).toBe('Allocated: 7 / 5 (2 over-allocated)');
  });

  it('adds nothing once the line is fully allocated', () => {
    expect(allocationSummary(5, 5)).toBe('Allocated: 5 / 5');
  });

  /* The quantity field can be emptied mid-edit. "0 remaining" would be a
     lie; nothing is allocated against nothing. */
  it('survives a quantity that has been cleared', () => {
    expect(allocationSummary(0, 0)).toBe('Allocated: 0 / 0');
  });

  it('reports everything as over-allocated against a cleared quantity', () => {
    expect(allocationSummary(2, 0)).toBe('Allocated: 2 / 0 (2 over-allocated)');
  });
});
