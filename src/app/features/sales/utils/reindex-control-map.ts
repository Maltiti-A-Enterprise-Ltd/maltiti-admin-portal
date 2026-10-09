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
