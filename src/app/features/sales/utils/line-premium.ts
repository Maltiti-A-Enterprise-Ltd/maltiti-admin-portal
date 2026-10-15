import { FormControl } from '@angular/forms';
import { PREMIUM_TYPE_OPTIONS, PremiumType } from '../models/sale.model';

/**
 * What a line's premium comes to, so the editor can show it as it is typed.
 *
 * Mirrors `sale-premium.util.ts` in the API, which is the figure of record —
 * the server recomputes this on save and the invoice prints its answer. This
 * copy exists so an admin can see what they are agreeing to before they save,
 * not so the client can decide the price.
 *
 * A cash premium is **per unit**, exactly as the price is: ten sacks at fifty
 * each is five hundred. A percentage is taken off the line's own total, so
 * both scale with quantity.
 */
export interface PremiumInput {
  quantity: number | null | undefined;
  price: number | null | undefined;
  type: PremiumType | null | undefined;
  value: number | null | undefined;
}

const round = (value: number): number => Math.round(value * 100) / 100;

const positive = (value: unknown): number => {
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : 0;
};

/** The premium in money. Zero when there is none, or only half of one. */
export function linePremium(input: PremiumInput): number {
  const value = positive(input.value);
  const quantity = positive(input.quantity);

  if (!value || !quantity || !input.type) {
    return 0;
  }

  if (input.type === PremiumType.PERCENT) {
    return round(positive(input.price) * quantity * (value / 100));
  }

  return round(value * quantity);
}

/**
 * Whether both halves of a premium are present.
 *
 * The API rejects a type with no value and a value with no type, so the form
 * has to catch that first — a save that fails validation after the admin has
 * filled in everything else is a poor way to learn the rule.
 */
export function isPremiumIncomplete(
  type: PremiumType | null | undefined,
  value: number | null | undefined,
): boolean {
  const hasType = !!type;
  const hasValue = positive(value) > 0;

  return hasType !== hasValue;
}

/**
 * The premium fields on one line of the sale form.
 *
 * A small object rather than a handful of methods on the editor, which is at
 * its length limit — and the same shape as `LinePrice` and `BoxQuantityLink`
 * beside it, which own their controls the same way.
 */
export class LinePremium {
  constructor(
    private readonly type: FormControl<PremiumType | null>,
    private readonly value: FormControl<number | null>,
    private readonly quantity: FormControl<number | null>,
    private readonly price: () => number,
  ) {}

  public readonly options = PREMIUM_TYPE_OPTIONS;

  /** What this line's premium comes to, for showing beside the fields. */
  public amount(): number {
    return linePremium({
      quantity: this.quantity.value,
      price: this.price(),
      type: this.type.value,
      value: this.value.value,
    });
  }

  /** True when one half was filled in and the other was not. */
  public incomplete(): boolean {
    return isPremiumIncomplete(this.type.value, this.value.value);
  }
}
