import { computed, DestroyRef, effect, inject, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';

/** What the link needs to know about the product on the line. */
export interface BoxedProduct {
  quantityInBox?: number | null;
}

/**
 * How many boxes a quantity comes to, or `null` when the product is not sold
 * by the box.
 */
export const boxesForQuantity = (
  quantity: number | null | undefined,
  perBox: number,
): number | null => {
  if (quantity === null || quantity === undefined || perBox <= 0) {
    return null;
  }

  // Three decimals is enough to show 10 of something packed 3 to a box as
  // 3.333 without carrying float noise into the input.
  return Math.round((quantity / perBox) * 1000) / 1000;
};

/**
 * Lets a line item be entered in boxes instead of loose units.
 *
 * Stock is picked and shipped by the box, so "4 boxes" is how an order is
 * actually placed, while the sale still has to record the unit quantity the
 * invoice and the stock ledger work in. The two stay in step: typing boxes
 * fills in the quantity, and typing a quantity shows what it comes to in boxes.
 *
 * Only offered for products that record how many units a box holds. Without
 * that figure there is nothing to multiply by, and a box of one would just
 * restate the quantity.
 */
export class BoxQuantityLink {
  public readonly boxesControl = new FormControl<number | null>(null);

  /** Units per box, or 0 when the product is not sold by the box. */
  public readonly perBox: Signal<number>;

  /** Whether to offer box entry at all. */
  public readonly isBoxed: Signal<boolean>;

  /** Guards our own writes so they are not mistaken for the user's. */
  private applying = false;

  constructor(
    private readonly quantityControl: FormControl<number | null>,
    product: Signal<BoxedProduct | null>,
  ) {
    this.perBox = computed(() => {
      const perBox = Number(product()?.quantityInBox);
      return Number.isFinite(perBox) && perBox > 1 ? perBox : 0;
    });
    this.isBoxed = computed(() => this.perBox() > 0);
  }

  /** Must be called from an injection context. */
  public connect(): void {
    const destroyRef = inject(DestroyRef);

    this.boxesControl.valueChanges
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((boxes) => {
        const perBox = this.perBox();

        if (this.applying || !perBox || boxes === null || boxes === undefined) {
          return;
        }

        // The sale is recorded in units, which cannot be fractional.
        this.write(this.quantityControl, Math.round(boxes * perBox));
      });

    this.quantityControl.valueChanges
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((quantity) => {
        if (!this.applying) {
          this.syncBoxesFrom(quantity);
        }
      });

    // A different product means a different box size, so the box figure has to
    // be recomputed from the quantity actually on the line rather than left
    // showing the previous product's count.
    effect(() => {
      this.perBox();
      this.syncBoxesFrom(this.quantityControl.value);
    });
  }

  private syncBoxesFrom(quantity: number | null): void {
    const perBox = this.perBox();
    const boxes = perBox ? boxesForQuantity(quantity, perBox) : null;

    if (this.boxesControl.value !== boxes) {
      this.write(this.boxesControl, boxes);
    }
  }

  private write(control: FormControl<number | null>, value: number | null): void {
    this.applying = true;
    control.setValue(value);
    this.applying = false;
  }
}
