/**
 * Drops the entry at `removedIndex` and shifts everything after it down one,
 * keeping a map keyed by row position in step with the rows it describes.
 *
 * Batch allocation controls are held in maps keyed by their index, so removing
 * a row from the middle would otherwise leave a gap and point every later
 * control at the wrong row.
 */
export const reindexControlMap = <T>(
  controlMap: Map<number, T>,
  removedIndex: number,
): Map<number, T> => {
  const result = new Map<number, T>();

  controlMap.forEach((value, key) => {
    if (key < removedIndex) {
      result.set(key, value);
    } else if (key > removedIndex) {
      result.set(key - 1, value);
    }
  });

  return result;
};

/**
 * Moves the entry at `from` to `to`, carrying everything between it and its
 * destination along by one.
 *
 * The same problem as `reindexControlMap` and the other half of it: these
 * maps are keyed by row position, so a row that changes position has to take
 * its entries with it or they describe whichever row has landed there.
 *
 * Gaps are preserved as gaps — a row with no entry has nothing to move.
 */
export const moveInControlMap = <T>(
  controlMap: Map<number, T>,
  from: number,
  to: number,
): Map<number, T> => {
  if (from === to) {
    return new Map(controlMap);
  }

  const highest = Math.max(from, to, ...controlMap.keys());
  const positions = Array.from({ length: highest + 1 }, (_, index) =>
    controlMap.get(index),
  );

  positions.splice(to, 0, ...positions.splice(from, 1));

  const result = new Map<number, T>();

  positions.forEach((value, index) => {
    if (value !== undefined) {
      result.set(index, value);
    }
  });

  return result;
};
