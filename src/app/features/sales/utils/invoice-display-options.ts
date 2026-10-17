import { signal, WritableSignal } from '@angular/core';
import { InvoiceCurrencyOptions } from '../models/sale-currency.model';

/**
 * The tick boxes on the invoice dialog that change how the PDF reads.
 *
 * Held together rather than as loose signals because each one had to be
 * written out in six places — the signal, the template, the toggle, the
 * reset on open, the reset on close, and *both* request payloads. Adding
 * one meant finding all six, and a flag that reaches five of them is a
 * feature that works in the preview and vanishes from the emailed copy.
 * That exact shape of bug has been found in this codebase repeatedly.
 *
 * With this, a new option is one entry in `OPTIONS` and one tick box.
 * `payload()` sends every one of them, so it cannot be the half that gets
 * forgotten.
 *
 * None of these change what is owed — only what is printed. The amounts,
 * the currency and the stored measurements are untouched by all of them.
 */
export type InvoiceDisplayOption =
  | 'includePayments'
  | 'showImperialWeights'
  | 'showBoxDimensions';

const OPTIONS: readonly InvoiceDisplayOption[] = [
  'includePayments',
  'showImperialWeights',
  'showBoxDimensions',
];

export class InvoiceDisplayOptions {
  /* All off. Every one of these adds something to the page, so the default
     is the plainest invoice — which is also what was being sent before any
     of them existed. */
  private readonly state: Record<
    InvoiceDisplayOption,
    WritableSignal<boolean>
  > = {
    includePayments: signal(false),
    showImperialWeights: signal(false),
    showBoxDimensions: signal(false),
  };

  /** Called after a toggle, so the preview is always what would be sent. */
  public onChange: () => void = () => undefined;

  public is(option: InvoiceDisplayOption): boolean {
    return this.state[option]();
  }

  public toggle(option: InvoiceDisplayOption): void {
    this.state[option].update((on) => !on);
    this.onChange();
  }

  public reset(): void {
    for (const option of OPTIONS) {
      this.state[option].set(false);
    }
  }

  /**
   * Every option, for both the preview request and the email request. The
   * two must agree: the PDF a customer is sent has to be the one the sender
   * looked at.
   */
  public payload(): Required<
    Pick<InvoiceCurrencyOptions, InvoiceDisplayOption>
  > {
    return {
      includePayments: this.is('includePayments'),
      showImperialWeights: this.is('showImperialWeights'),
      showBoxDimensions: this.is('showBoxDimensions'),
    };
  }
}
