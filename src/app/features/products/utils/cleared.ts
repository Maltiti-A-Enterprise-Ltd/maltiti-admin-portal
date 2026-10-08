/**
 * Prepares an optional, nullable field for the API.
 *
 * Emptying a field has to be sent as an explicit `null`, not left out of the
 * request. The API assigns the DTO's properties straight onto the entity, and
 * TypeORM ignores `undefined` on save — so an omitted field silently keeps the
 * value it already had. Clearing a product's grade looked like it worked and
 * did not.
 *
 * `0` and `false` are values, not emptiness, so they pass through; the `||`
 * idiom this replaces discarded them.
 */
export const cleared = <T>(value: T | null | undefined): T | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  return value;
};
