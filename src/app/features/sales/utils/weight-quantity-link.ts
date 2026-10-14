import { computed, DestroyRef, effect, inject, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { UnitOfMeasurement } from '@features/products/models/product.model';

/** What the link needs to know about the product on the line. */
export interface WeighedProduct {
  weight?: string | null;
  unitOfMeasurement?: UnitOfMeasurement | null;
  quantityInBox?: number | null;
}

/** The bulk unit an order is placed in, and how much of it one unit is. */
interface BulkUnit {
  readonly label: 'kg' | 'L';
  readonly per: number;
}

/**
 * How a product's own unit rolls up into the unit an order is placed in.
 *
 * Bulk orders are not spoken about in the product's unit: nobody asks for
 * 250,000 g of shea butter, they ask for 250 kg. Mass therefore rolls up to
 * kilograms and volume to litres, so the number typed is the number said on
 * the phone.
 *
 * The factors match `KILOGRAMS_PER_UNIT` in the backend's sale-attention work,
 * including the company rule that a litre is declared as a kilogram — but the
 * two are not interchangeable. That one converts everything to kilograms for a
 * shipping weight; this one keeps volume in litres, because an order for soap
 * is placed in litres whatever it weighs.
 */
const BULK_UNITS: Record<UnitOfMeasurement, BulkUnit> = {
  [UnitOfMeasurement.KILOGRAM]: { label: 'kg', per: 1 },
  [UnitOfMeasurement.GRAM]: { label: 'kg', per: 0.001 },
  [UnitOfMeasurement.POUND]: { label: 'kg', per: 0.45359237 },
  [UnitOfMeasurement.LITRE]: { label: 'L', per: 1 },
  [UnitOfMeasurement.MILLILITRE]: { label: 'L', per: 0.001 },
};

/** What one unit of the product comes to in its bulk unit, e.g. 0.5 kg. */
export function unitSizeInBulk(product: WeighedProduct | null): BulkUnit & { size: number } {
  const unit = product?.unitOfMeasurement;
  const bulk = unit ? BULK_UNITS[unit] : undefined;
  const weight = Number(product?.weight);

  if (!bulk || !Number.isFinite(weight) || weight <= 0) {
    return { label: 'kg', per: 0, size: 0 };
  }

  return { ...bulk, size: weight * bulk.per };
}

/** Trims float noise so 0.1 + 0.2 worth of units does not show as 0.30000000004. */
const tidy = (value: number): number => Math.round(value * 1000) / 1000;

/**
 * Lets a line item be entered as a total weight instead of a unit count.
 *
 * Shea butter is ordered by the tonne, not by the tub: a buyer asks for 250 kg
 * and somebody then has to work out that this is 500 of the 500 g size. Typing
 * the total and letting the quantity fall out of it removes that arithmetic,
 * and the mistakes that come with doing it in your head.
 *
 * Offered only for products that record a size and are **not** sold by the box.
 * Where both apply the box count wins, because that is how the order is picked,
 * and two helper fields driving the same quantity would be ambiguous.
 *
 * The quantity is whole — you cannot ship two thirds of a tub — so 250 kg of a
 * 1.5 kg product is 167 units, which is really 250.5 kg. The typed figure is
 * left alone rather than corrected under the cursor, which would fight anyone
 * mid-keystroke; `actualTotal` carries the true figure instead, for the line
 * to show beside it. Silently treating 250.5 as 250 is the one thing this must
 * not do.
 */
export class WeightQuantityLink {
  public readonly totalControl = new FormControl<number | null>(null);

  /** One unit's size in the bulk unit, or 0 when the product has no size. */
  public readonly unitSize: Signal<number>;

  /** "kg" or "L", for the field's label. */
  public readonly unitLabel: Signal<'kg' | 'L'>;

  /** Whether to offer total-weight entry at all. */
  public readonly isWeighed: Signal<boolean>;

  /**
   * What the quantity on the line actually comes to.
   *
   * Differs from the typed total whenever the division did not land on a whole
   * unit, which is most of the time. Shown beside the field so the rounding is
   * visible rather than discovered on the invoice.
   */
  public readonly actualTotal: Signal<number | null>;

  /** Guards our own writes so they are not mistaken for the user's. */
  private applying = false;

  /** Mirrors the quantity control, so `actualTotal` can be a computed. */
  private readonly quantityValue = signal<number | null>(null);

  constructor(
    private readonly quantityControl: FormControl<number | null>,
    product: Signal<WeighedProduct | null>,
  ) {
    const bulk = computed(() => unitSizeInBulk(product()));

    this.unitSize = computed(() => bulk().size);
    this.unitLabel = computed(() => bulk().label);

    const isBoxed = computed(() => {
      const perBox = Number(product()?.quantityInBox);
      return Number.isFinite(perBox) && perBox > 1;
    });

    this.isWeighed = computed(() => this.unitSize() > 0 && !isBoxed());

    /* A plain signal rather than toSignal: the constructor is not guaranteed
       to run in an injection context, and this class should not depend on
       where it happens to be created. `connect` keeps it fed. */
    this.actualTotal = computed(() => {
      const size = this.unitSize();
      const count = this.quantityValue();

      return size && count ? tidy(count * size) : null;
    });
  }

  /** Must be called from an injection context. */
  public connect(): void {
    const destroyRef = inject(DestroyRef);

    this.quantityValue.set(this.quantityControl.value);

    this.totalControl.valueChanges
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((total) => {
        const size = this.unitSize();

        if (this.applying || !size || total === null || total === undefined) {
          return;
        }

        /* At least one: a total smaller than a single unit still means the
           buyer wants one of them, and rounding to zero would silently empty
           the line. */
        this.write(this.quantityControl, Math.max(1, Math.round(total / size)));
      });

    this.quantityControl.valueChanges
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((quantity) => {
        /* Set before the guard: `actualTotal` has to follow the quantity even
           when we were the ones who wrote it, which is exactly the rounded
           case it exists to report. */
        this.quantityValue.set(quantity);

        if (!this.applying) {
          this.syncTotalFrom(quantity);
        }
      });

    /* A different product is a different size, so the total has to be redone
       from the quantity on the line rather than left showing the old one's. */
    effect(() => {
      this.unitSize();
      this.syncTotalFrom(this.quantityControl.value);
    });
  }

  private syncTotalFrom(quantity: number | null): void {
    const size = this.unitSize();
    const total =
      size && quantity !== null && quantity !== undefined ? tidy(quantity * size) : null;

    if (this.totalControl.value !== total) {
      this.write(this.totalControl, total);
    }
  }

  private write(control: FormControl<number | null>, value: number | null): void {
    this.applying = true;
    control.setValue(value);
    this.applying = false;
  }
}
