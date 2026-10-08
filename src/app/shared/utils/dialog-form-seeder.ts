/**
 * Tracks whether a dialog's form has already been populated for the entity it
 * is currently open on.
 *
 * Dialog components typically seed their form from an `effect()` that reads the
 * `visible` and entity inputs. That effect can run again while the dialog is
 * open — change detection re-runs it even when neither input has changed — and
 * a naive implementation re-seeds on every pass, wiping whatever the user has
 * typed or picked. Selects suffer most visibly: the value lands and is erased
 * before it ever renders.
 *
 * Guarding on the entity id alone is not enough, because "adding" (no entity,
 * id `null`) is itself a state the form gets seeded into. Comparing `undefined`
 * against `null` is always false, so an add-mode dialog would re-seed forever.
 * This class keeps "never seeded" and "seeded for the blank/add form" apart.
 */
export class DialogFormSeeder {
  private static readonly NOT_SEEDED = Symbol('not-seeded');

  private seededFor: string | null | symbol = DialogFormSeeder.NOT_SEEDED;

  /**
   * Call when the dialog is closed, so the next open seeds the form afresh —
   * even if it reopens on the same entity.
   */
  public markClosed(): void {
    this.seededFor = DialogFormSeeder.NOT_SEEDED;
  }

  /**
   * True the first time it is asked about a given entity while the dialog is
   * open, and whenever the dialog switches to a different entity. Pass `null`
   * when there is no entity (the "add new" case).
   *
   * Calling this records the id, so a caller must seed the form when it returns
   * true.
   */
  public shouldSeed(entityId: string | null): boolean {
    if (this.seededFor === entityId) {
      return false;
    }

    this.seededFor = entityId;

    return true;
  }
}
