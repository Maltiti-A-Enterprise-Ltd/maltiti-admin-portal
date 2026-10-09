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
}

/**
 * Keeps In-Box Price in step with Wholesale Price and Quantity per Box.
 *
 * The field auto-fills while nobody has touched it, which is the common case:
 * a box is worth what its contents are worth. But In-Box Price is a real
 * customer-facing price — it has its own price-change email — and boxes are
 * often discounted below the sum of their parts, so a hand-typed amount wins
 * and stops the auto-fill until it is reset.
 *
 * An existing product whose stored price does not match the formula is treated
 * as already overridden, so opening a product for an unrelated edit never
 * silently reprices it.
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

    this.controls.inBoxPrice.valueChanges
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        if (!this.applying) {
          this.overriddenState.set(true);
        }
      });

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

    this.calculatedState.set(calculated);
    this.overriddenState.set(
      calculated !== null && current !== null && Number(current) !== calculated,
    );
  }

  /** Drops a hand-typed amount and goes back to the calculated one. */
  public reset(): void {
    this.overriddenState.set(false);
    this.refresh();
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
