/**
 * Printing an invoice at unit prices other than the sale's.
 *
 * Some buyers are invoiced on a different basis from the one the order was
 * recorded on. Nothing here touches the sale: it only decides what the PDF
 * shows, and the sale keeps its own prices, total and balance.
 *
 * Held together like `InvoiceDisplayOptions` next door, and for the same
 * reason — `payload()` is spread into both the preview request and the email
 * request, so an adjusted price cannot reach one and not the other. On this
 * feature that bug would send a customer a different document from the one
 * that was approved.
 */

import { computed, signal, Signal, WritableSignal } from '@angular/core';
import { SaleLineItem } from '../models/sale.model';

/** One line's price, as the API wants it. */
export interface InvoiceLinePrice {
  /** Position in the sale's line items — they have no id of their own. */
  index: number;
  /** What we expect to find there. The API checks it rather than trusting it. */
  productId: string;
  unitPrice: number;
}

/** A line as the adjustment panel shows it. */
export interface AdjustableLine {
  readonly index: number;
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  /** What the sale records. Never changes. */
  readonly salePrice: number;
  /** What the invoice will print. Starts equal to the sale's. */
  readonly invoicePrice: number;
}

const round = (value: number): number => Math.round(value * 100) / 100;

export class InvoicePriceAdjustments {
  private readonly state: WritableSignal<AdjustableLine[]> = signal([]);

  /** The prices the preview was last built with, so typing is free. */
  private committed = '';

  /** Called after a change, so the preview is always what would be sent. */
  public onChange: () => void = () => undefined;

  public readonly lines: Signal<readonly AdjustableLine[]> =
    this.state.asReadonly();

  /** What the sale says these goods come to. */
  public readonly saleTotal = computed(() =>
    round(
      this.state().reduce((sum, line) => sum + line.salePrice * line.quantity, 0),
    ),
  );

  /** What the invoice will say they come to. */
  public readonly invoiceTotal = computed(() =>
    round(
      this.state().reduce(
        (sum, line) => sum + line.invoicePrice * line.quantity,
        0,
      ),
    ),
  );

  public readonly difference = computed(() =>
    round(this.invoiceTotal() - this.saleTotal()),
  );

  /**
   * Whether any price actually differs from the sale's.
   *
   * A price retyped to the same figure is not an adjustment. It matters:
   * the API drops the payments section from an adjusted invoice, and losing
   * it over a number nobody changed would be baffling.
   */
  public readonly isAdjusted = computed(() =>
    this.state().some((line) => line.invoicePrice !== line.salePrice),
  );

  /** Opens on the sale's own prices, which is the unadjusted invoice. */
  public reset(lineItems: readonly SaleLineItem[] = []): void {
    this.state.set(
      lineItems.map((item, index) => {
        const salePrice = round(Number(item.finalPrice) || 0);

        return {
          index,
          productId: item.productId,
          productName: item.productName?.trim() || 'Unknown product',
          quantity: Number(item.requestedQuantity) || 0,
          salePrice,
          invoicePrice: salePrice,
        };
      }),
    );
    this.committed = this.signature();
  }

  /**
   * What has been typed, before it is acted on.
   *
   * Regenerating the PDF on every keystroke would mean a server round trip
   * per digit — and "6" on the way to "62" is a real price the preview would
   * briefly show.
   */
  public setPending(index: number, price: number | null): void {
    this.state.update((lines) =>
      lines.map((line) =>
        line.index === index
          ? { ...line, invoicePrice: round(Number(price) || 0) }
          : line,
      ),
    );
  }

  /** Called when a field is left. Rebuilds the preview only if it moved. */
  public commit(): void {
    const current = this.signature();

    if (current === this.committed) {
      return;
    }

    this.committed = current;
    this.onChange();
  }

  /** What the prices are, as one comparable value. */
  private signature(): string {
    return this.state()
      .map((line) => line.invoicePrice)
      .join('|');
  }

  /** Back to the sale's prices. */
  public clear(): void {
    this.state.update((lines) =>
      lines.map((line) => ({ ...line, invoicePrice: line.salePrice })),
    );
    this.commit();
  }

  /**
   * The prices to send, or nothing at all.
   *
   * Omitted entirely when nothing was changed, so an ordinary invoice sends
   * an ordinary request and keeps everything an ordinary invoice has.
   */
  public payload(): { lineItemPrices?: InvoiceLinePrice[] } {
    if (!this.isAdjusted()) {
      return {};
    }

    return {
      lineItemPrices: this.state().map((line) => ({
        index: line.index,
        productId: line.productId,
        unitPrice: line.invoicePrice,
      })),
    };
  }
}
