import { computed, inject, Injectable, signal } from '@angular/core';
import { take } from 'rxjs';
import { ExchangeRateApiService } from './exchange-rate-api.service';
import { currencySymbol } from '@shared/utils/sale-money';
import {
  INVOICE_CURRENCY_LABELS,
  InvoiceCurrency,
  InvoiceCurrencyOptions,
} from '../models/sale.model';

/**
 * A currency and the rate it is struck at, with the feed behind it.
 *
 * Used in two places that look alike and mean different things. On the sales
 * form it is the **deal** currency: what the order was negotiated in, pinned
 * once and not changed afterwards. On the invoice dialog it is a
 * presentation choice — printing a cedi sale in dollars for a buyer's
 * convenience, re-pickable at any time.
 *
 * Nothing here ever invents a rate. When the feed cannot be reached the field
 * is left for the admin to fill in, which is the fallback this feature was
 * asked to have.
 */
@Injectable()
export class CurrencyRateState {
  private readonly api = inject(ExchangeRateApiService);

  /**
   * Called whenever the currency or rate settles on something the invoice can
   * actually be generated with. Set once by the owning component.
   */
  public onSettled: (() => void) | null = null;

  public readonly currency = signal<InvoiceCurrency>(InvoiceCurrency.GHS);
  /** Cedis per one unit of `currency`. Meaningless while the currency is GHS. */
  public readonly exchangeRate = signal<number | null>(null);
  public readonly fetching = signal(false);
  /** When the fetched rate was published; null once the admin types over it. */
  public readonly asOf = signal<string | null>(null);
  public readonly error = signal<string | null>(null);

  public readonly options = Object.values(InvoiceCurrency).map((value) => ({
    label: INVOICE_CURRENCY_LABELS[value],
    value,
  }));

  public readonly isForeign = computed(
    () => this.currency() !== InvoiceCurrency.GHS,
  );

  /** What to print in front of an amount: "GH₵", "USD", "CAD". */
  public readonly symbol = computed(() =>
    currencySymbol({ currency: this.currency() }),
  );

  /**
   * A foreign-currency invoice with no rate would be generated at 1:1 and look
   * like a working preview, which is the most expensive way to get this wrong.
   */
  public readonly needsRate = computed(
    () => this.isForeign() && !(this.exchangeRate() ?? 0),
  );

  /** Opens on what this sale was last invoiced at, or cedis. */
  public reset(
    currency?: InvoiceCurrency | null,
    exchangeRate?: number | null,
  ): void {
    this.currency.set(currency ?? InvoiceCurrency.GHS);
    this.exchangeRate.set(exchangeRate ?? null);
    this.asOf.set(null);
    this.error.set(null);
    this.fetching.set(false);
  }

  /**
   * Switching currency always fetches a fresh rate, and never carries the old
   * one over.
   *
   * Carrying it over would mean invoicing in Canadian dollars at the US rate
   * — a wrong number that looks entirely plausible on the page. A rate the
   * admin agreed is preserved where it belongs instead: in `reset`, which
   * reopens a sale on the pair it was last invoiced at.
   */
  public selectCurrency(currency: InvoiceCurrency): void {
    if (currency === this.currency()) {
      return;
    }

    this.currency.set(currency);
    this.exchangeRate.set(null);
    this.asOf.set(null);
    this.error.set(null);

    if (currency === InvoiceCurrency.GHS) {
      this.settled();
      return;
    }

    this.fetchTodaysRate();
  }

  /** Explicitly asked for, so it overwrites whatever is in the box. */
  public fetchTodaysRate(): void {
    const currency = this.currency();

    if (currency === InvoiceCurrency.GHS) {
      return;
    }

    this.fetching.set(true);
    this.error.set(null);

    this.api
      .getRate(currency)
      .pipe(take(1))
      .subscribe({
        next: (quote) => {
          this.fetching.set(false);
          this.exchangeRate.set(quote.rate);
          this.asOf.set(quote.asOf);
          this.settled();
        },
        error: () => {
          this.fetching.set(false);
          this.asOf.set(null);
          this.error.set(
            'Could not reach the rate service. Enter the rate you have agreed.',
          );
        },
      });
  }

  /** The admin typed over the rate, so it is theirs, not the feed's. */
  public setRate(rate: number | null): void {
    this.exchangeRate.set(rate);
    this.asOf.set(null);
    this.settled();
  }

  /** What both the preview and the email must be built with. */
  public payload(): InvoiceCurrencyOptions {
    return this.isForeign()
      ? { currency: this.currency(), exchangeRate: this.exchangeRate() ?? 0 }
      : { currency: InvoiceCurrency.GHS };
  }

  private settled(): void {
    if (!this.needsRate()) {
      this.onSettled?.();
    }
  }
}
