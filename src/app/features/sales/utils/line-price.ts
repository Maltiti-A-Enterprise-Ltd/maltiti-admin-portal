import { computed, Signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { LightProduct } from '@features/products/models/product.model';
import { InvoiceCurrency, PriceType } from '../models/sale.model';
import { currencySymbol } from '@shared/utils/sale-money';
import { unitSizeInBulk } from './weight-quantity-link';

/**
 * What a line item costs, and where that figure comes from.
 *
 * Pulled out of the line-item editor, which was over its length limit and had
 * grown three separate copies of "wholesale or retail?". One place decides it
 * now, which is what makes the currency rule below possible to state once.
 *
 * **The catalogue is priced in cedis.** On a sale negotiated in another
 * currency, dropping a catalogue figure into the line would read as a
 * perfectly plausible price while being out by the exchange rate — 60 CAD
 * where 60 GHS was meant. Nor is the right answer the catalogue price
 * converted: an export is negotiated, and what it was agreed at is not
 * derivable from the shelf price. So on a foreign sale nothing is filled in
 * and the number is typed.
 */
export class LinePrice {
  /** "GH₵", "USD", "CAD" — what to show against this line's money. */
  public readonly symbol: Signal<string>;

  /** Whether this sale is in something other than the base currency. */
  public readonly isForeign: Signal<boolean>;

  constructor(
    private readonly customPrice: FormControl<number | undefined | null>,
    private readonly quantity: FormControl<number | null>,
    private readonly priceType: FormControl<PriceType | null>,
    private readonly product: Signal<LightProduct | null>,
    currency: Signal<InvoiceCurrency | undefined>,
  ) {
    this.symbol = computed(() => currencySymbol({ currency: currency() }));
    this.isForeign = computed(
      () => !!currency() && currency() !== InvoiceCurrency.GHS,
    );
  }

  /**
   * The shelf price for the selected product, or 0 where there is none to
   * take — no product chosen, or a sale this does not apply to.
   */
  public catalogue(): number {
    const product = this.product();

    if (!product || this.isForeign()) {
      return 0;
    }

    return this.priceType.value === 'retail' ? product.retail : product.wholesale;
  }

  /** Fill the price in from the catalogue, where that is meaningful. */
  public fillFromCatalogue(): void {
    const price = this.catalogue();

    if (price) {
      this.customPrice.setValue(price);
    }
  }

  /** Fill it in only if the line has no price yet, so typing is never undone. */
  public fillIfEmpty(): void {
    if (!this.customPrice.value) {
      this.fillFromCatalogue();
    }
  }

  /** The price in force on this line: the typed one, else the shelf price. */
  public effective(): number {
    return this.customPrice.value || this.catalogue();
  }

  /** Quantity times the price actually in force on this line. */
  public total(): number {
    return (this.quantity.value || 0) * this.effective();
  }

  /**
   * What this line comes to per kilogram or per litre, e.g. `"GH₵ 2.40 / kg"`.
   *
   * A 25 kg sack at 60 and a 500 g tub at 4.50 are not comparable figures
   * until somebody divides, and that division is exactly what a buyer quotes
   * back at you. Doing it in your head during a call is how a sack goes out
   * underpriced.
   *
   * Null where the figure would mean nothing: no price entered yet, or a
   * product that records no size — a bar of soap sold by the piece has no
   * price per kilogram, and inventing one would be worse than showing none.
   */
  public perBulkUnit(): string | null {
    const { size, label } = unitSizeInBulk(this.product());
    const price = this.effective();

    if (!size || !price) {
      return null;
    }

    const rate = price / size;

    return `${this.symbol()} ${rate.toLocaleString('en-GH', {
      minimumFractionDigits: 2,
      /* A rate under a pesewa would otherwise print as "0.00 / kg" — true to
         the arithmetic and useless on the screen. */
      maximumFractionDigits: rate < 0.01 ? 4 : 2,
    })} / ${label}`;
  }
}
