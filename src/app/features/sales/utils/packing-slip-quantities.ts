/**
 * The lines of a packing slip: how much of each goes in this shipment, and
 * which are ticked as packed.
 *
 * Printing a packing slip for part of an order.
 *
 * Some orders go out in more than one shipment. Nothing here touches the
 * sale: it only decides what this slip lists, and the sale keeps its own
 * quantities and stock. Mirrors `InvoicePriceAdjustments` — `payload()` is
 * what both the preview and the download are built from, so the slip that is
 * downloaded is always the one that was previewed.
 */

import { computed, signal, Signal, WritableSignal } from '@angular/core';
import { SaleLineItem } from '../models/sale.model';
import { PackingSlipLineQuantity, PackingSlipLineRef } from '../models/packing-slip.model';

/** A line as the quantities panel shows it. */
export interface ShippableLine {
  readonly index: number;
  readonly productId: string;
  readonly productName: string;
  /** What the sale records. The most this slip may list. */
  readonly ordered: number;
  /** What this slip will list. Starts equal to the order. 0 leaves it off. */
  readonly shipping: number;
  /** Printed with its PACKED box ticked. Nothing is saved. */
  readonly packed: boolean;
}

const round = (value: number): number => Math.round(value * 100) / 100;

export class PackingSlipQuantities {
  private readonly state: WritableSignal<ShippableLine[]> = signal([]);

  /** The quantities the preview was last built with, so typing is free. */
  private committed = '';

  /** Called after a change, so the preview is always what would be downloaded. */
  public onChange: () => void = () => undefined;

  public readonly lines: Signal<readonly ShippableLine[]> = this.state.asReadonly();

  /** Whether this slip differs from the order at all. */
  public readonly isPartial = computed(() =>
    this.state().some((line) => line.shipping !== line.ordered),
  );

  /** How many lines will be on the slip. */
  public readonly shippedLineCount = computed(
    () => this.state().filter((line) => line.shipping > 0).length,
  );

  /** Lines on the slip that are ticked, and lines that could be. */
  public readonly packedCount = computed(
    () => this.state().filter((line) => line.shipping > 0 && line.packed).length,
  );

  public readonly allPacked = computed(
    () => this.shippedLineCount() > 0 && this.packedCount() === this.shippedLineCount(),
  );

  /** The API refuses a slip with nothing on it; so does the dialog. */
  public readonly isEmpty = computed(
    () => this.state().length > 0 && this.shippedLineCount() === 0,
  );

  /** Opens on the order as it stands, which is the ordinary slip. */
  public reset(lineItems: readonly SaleLineItem[] = []): void {
    this.state.set(
      lineItems.map((item, index) => {
        const ordered = round(Number(item.requestedQuantity) || 0);

        return {
          index,
          productId: item.productId,
          productName: item.productName?.trim() || 'Unknown product',
          ordered,
          shipping: ordered,
          packed: false,
        };
      }),
    );
    this.committed = this.signature();
  }

  /**
   * What has been typed, before it is acted on. Clamped to what was ordered:
   * a slip listing more than the order holds is refused by the API, and
   * catching it here saves a failed preview.
   */
  public setPending(index: number, quantity: number | null): void {
    this.state.update((lines) =>
      lines.map((line) =>
        line.index === index
          ? {
              ...line,
              shipping: Math.min(line.ordered, Math.max(0, round(Number(quantity) || 0))),
            }
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

    // Nothing to preview; the dialog says why instead.
    if (!this.isEmpty()) {
      this.onChange();
    }
  }

  /**
   * Ticks or unticks one line. A click is a finished decision, so unlike a
   * typed quantity the preview is rebuilt straight away.
   */
  public setPacked(index: number, packed: boolean): void {
    this.state.update((lines) =>
      lines.map((line) => (line.index === index ? { ...line, packed } : line)),
    );
    this.commit();
  }

  /** Ticks every line on the slip, or clears them all. */
  public setAllPacked(packed: boolean): void {
    this.state.update((lines) =>
      lines.map((line) => ({ ...line, packed: packed && line.shipping > 0 })),
    );
    this.commit();
  }

  /** Back to the full order. */
  public clear(): void {
    this.state.update((lines) => lines.map((line) => ({ ...line, shipping: line.ordered })));
    this.commit();
  }

  /**
   * The quantities to send, or nothing at all. Only the lines that differ,
   * so an ordinary slip sends an ordinary request.
   */
  public payload(): {
    lineQuantities?: PackingSlipLineQuantity[];
    packedLines?: PackingSlipLineRef[];
  } {
    const changed = this.state().filter((line) => line.shipping !== line.ordered);
    // A tick on a line that is left off has nowhere to print.
    const packed = this.state().filter((line) => line.packed && line.shipping > 0);

    return {
      ...(changed.length
        ? {
            lineQuantities: changed.map((line) => ({
              index: line.index,
              productId: line.productId,
              quantity: line.shipping,
            })),
          }
        : {}),
      ...(packed.length
        ? {
            packedLines: packed.map((line) => ({
              index: line.index,
              productId: line.productId,
            })),
          }
        : {}),
    };
  }

  private signature(): string {
    return this.state()
      .map((line) => `${line.shipping}:${line.packed ? 1 : 0}`)
      .join('|');
  }
}
