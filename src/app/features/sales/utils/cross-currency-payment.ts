import { computed, effect, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, Validators } from '@angular/forms';
import { startWith } from 'rxjs/operators';
import { INVOICE_CURRENCY_LABELS, InvoiceCurrency } from '../models/sale.model';

/**
 * Recording a payment that arrived in a different currency from the sale.
 *
 * A customer may well settle a cedi invoice in dollars. The figure on the
 * bank statement is the only number an admin can actually check, so that is
 * what they should type — not the result of converting it on a calculator.
 *
 * What settles the sale is still the sale's own currency, because that is
 * what has to subtract from the balance. The API does that conversion; this
 * previews it, so the settled figure is visible before saving rather than
 * discovered afterwards.
 *
 * Pulled out of the payment dialog, which was over its length limit.
 */
export class CrossCurrencyPayment {
  /** The currency picked, or null while the payment is in the sale's own. */
  public readonly picked: Signal<InvoiceCurrency | null>;

  /** Whether the conversion fields apply at all. */
  public readonly isCrossCurrency: Signal<boolean>;

  /**
   * What this payment would settle, in the sale's currency.
   *
   * Null until both the amount and the rate are in — a half-filled
   * conversion has no answer, and showing a figure derived from one of them
   * would be worse than showing none.
   */
  public readonly settled: Signal<number | null>;

  public readonly options = Object.values(InvoiceCurrency).map((value) => ({
    label: INVOICE_CURRENCY_LABELS[value],
    value,
  }));

  constructor(
    currency: FormControl<InvoiceCurrency | null>,
    amount: FormControl<number | null>,
    rate: FormControl<number | null>,
    saleCurrency: Signal<InvoiceCurrency | undefined>,
    /** Relaxed while the figure is being derived rather than typed. */
    settledControl?: FormControl<number | null>,
  ) {
    this.picked = toSignal(currency.valueChanges.pipe(startWith(currency.value)), {
      initialValue: currency.value,
    });

    const receivedAmount = toSignal(
      amount.valueChanges.pipe(startWith(amount.value)),
      { initialValue: amount.value },
    );
    const receivedRate = toSignal(rate.valueChanges.pipe(startWith(rate.value)), {
      initialValue: rate.value,
    });

    /* Picking the sale's own currency is not a conversion — it is the
       ordinary case said out loud, and demanding a rate for it would be a
       pointless field to fill in. */
    this.isCrossCurrency = computed(() => {
      const picked = this.picked();

      return !!picked && picked !== (saleCurrency() ?? InvoiceCurrency.GHS);
    });

    this.settled = computed(() => {
      const received = Number(receivedAmount());
      const converted = Number(receivedRate());

      if (!this.isCrossCurrency() || !received || !converted) {
        return null;
      }

      return Math.round(received * converted * 100) / 100;
    });

    /* The settled amount is required only when somebody has to type it.
       Leaving the validator on would block a perfectly complete
       cross-currency payment for want of a field it derives. */
    if (settledControl) {
      effect(() => {
        settledControl.setValidators(
          this.isCrossCurrency()
            ? [Validators.min(0)]
            : [Validators.required, Validators.min(0.01)],
        );
        settledControl.updateValueAndValidity({ emitEvent: false });
      });
    }
  }
}
