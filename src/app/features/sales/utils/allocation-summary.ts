/**
 * The one-line summary under a line item's batch allocations.
 *
 * Built here rather than in the template because the template was reading
 * the requested quantity five separate times to say three things, and the
 * two branches it took to do that sat on top of an already deeply nested
 * form. The sentence is the unit anyone cares about — assemble it once.
 *
 * Allocating less than was sold is normal: the rest came from stock that is
 * not batch-tracked. Allocating more is a mistake, and the wording says so
 * plainly rather than leaving a reader to spot that 7 is bigger than 5.
 */
export function allocationSummary(allocated: number, requested: number): string {
  const base = `Allocated: ${allocated} / ${requested}`;

  if (allocated < requested) {
    return `${base} (${requested - allocated} remaining)`;
  }

  if (allocated > requested) {
    return `${base} (${allocated - requested} over-allocated)`;
  }

  return base;
}
