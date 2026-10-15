import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';

/**
 * A box is a bulk unit, so its price starts from the wholesale rate rather than
 * the per-piece shelf rate.
 */
export const calculateInBoxPrice = (
  wholesale: number | null | undefined,
  quantityInBox: number | null | undefined,
): number | null => {
  // `Number(null)` is 0, so an emptied field would price the box at zero
  // rather than leave it alone. Rule the blanks out before converting.
  if (wholesale === null || wholesale === undefined) {
    return null;
  }

  if (quantityInBox === null || quantityInBox === undefined) {
    return null;
  }

  const unitPrice = Number(wholesale);
  const perBox = Number(quantityInBox);

  if (!Number.isFinite(unitPrice) || !Number.isFinite(perBox) || perBox <= 0) {
    return null;
  }

  // Currency, so two decimals — 12.345 x 3 must not become 37.034999999999996.
  return Math.round(unitPrice * perBox * 100) / 100;
};

export interface InBoxPriceControls {
  wholesale: FormControl<number | null>;
  quantityInBox: FormControl<number | null>;
  inBoxPrice: FormControl<number | null>;
  /** The "set it by hand" tick. Unticked, the amount is derived and locked. */
  inBoxPriceOverride: FormControl<boolean | null>;
}

/**
 * Keeps In-Box Price in step with Wholesale Price and Quantity per Box.
 *
 * A box is worth what its contents are worth, so the amount is **derived and
 * the field is locked** — the figure is Wholesale × Quantity per Box and
 * there is nothing to type. Boxes are routinely discounted below the sum of
 * their parts, so an explicit tick unlocks the field and stops the auto-fill.
 *
 * The tick replaces an older rule where simply typing counted as an override.
 * That was invisible: the field looked editable, so people edited it, and
 * nothing said the price had stopped tracking the quantity they then changed.
 *
 * An existing product whose stored price does not match the formula opens
 * with the tick already set, so an unrelated edit never silently reprices it.
 */
export class InBoxPriceLink {
  private readonly overriddenState = signal(false);
  private readonly calculatedState = signal<number | null>(null);

  /** True once the amount has been typed in by hand. */
  public readonly overridden = this.overriddenState.asReadonly();

  /** What the formula currently yields, or null when it cannot be computed. */
  public readonly calculated = this.calculatedState.asReadonly();

  /** Guards our own writes so they are not mistaken for the user's. */
  private applying = false;

  constructor(private readonly controls: InBoxPriceControls) {}

  /** Must be called from an injection context. */
  public connect(): void {
    const destroyRef = inject(DestroyRef);

    for (const source of [this.controls.wholesale, this.controls.quantityInBox]) {
      source.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.refresh());
    }

    this.controls.inBoxPriceOverride.valueChanges
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(override => this.applyOverride(!!override));

    this.applyOverride(!!this.controls.inBoxPriceOverride.value);
    this.refresh();
  }

  /**
   * Locks or unlocks the amount.
   *
   * Unticking goes straight back to the calculated figure rather than
   * leaving the last typed one sitting in a field that now claims to be
   * derived — a number that says it is calculated and is not is the whole
   * problem this replaced.
   */
  private applyOverride(override: boolean): void {
    this.overriddenState.set(override);

    /* `emitEvent: false` so toggling the lock is not itself read as a change
       to the price. The control is disabled, not readonly, so the save path
       has to use `getRawValue()` — `value` drops disabled controls, and the
       payload builder turns a missing price into an explicit null. */
    if (override) {
      this.controls.inBoxPrice.enable({ emitEvent: false });
    } else {
      this.controls.inBoxPrice.disable({ emitEvent: false });
    }

    this.refresh();
  }

  /**
   * Re-reads the form after it has been seeded, deciding whether the amount it
   * was seeded with counts as an override. Call after `patchValue`/`reset`.
   */
  public resync(): void {
    const calculated = calculateInBoxPrice(
      this.controls.wholesale.value,
      this.controls.quantityInBox.value,
    );
    const current = this.controls.inBoxPrice.value;

    const overridden =
      calculated !== null && current !== null && Number(current) !== calculated;

    this.calculatedState.set(calculated);
    /* Through the control, so the tick on screen agrees with the state. */
    this.controls.inBoxPriceOverride.setValue(overridden, { emitEvent: false });
    this.applyOverride(overridden);
  }

  /** Drops a hand-typed amount and goes back to the calculated one. */
  public reset(): void {
    this.controls.inBoxPriceOverride.setValue(false);
  }

  private refresh(): void {
    const calculated = calculateInBoxPrice(
      this.controls.wholesale.value,
      this.controls.quantityInBox.value,
    );

    this.calculatedState.set(calculated);

    if (this.overriddenState() || calculated === null) {
      return;
    }

    if (Number(this.controls.inBoxPrice.value) === calculated) {
      return;
    }

    this.applying = true;
    // `emitEvent: false` would also skip the override listener, but the form's
    // own validity still needs to settle, so suppress by flag instead.
    this.controls.inBoxPrice.setValue(calculated);
    this.applying = false;
  }
}
