import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { first } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { SalesApiService } from '../../services/sales-api.service';
import { Debtor, EMPTY_SALES_METRICS, SalesMetrics } from '../../models/sales-metrics.model';

/**
 * What the sales book is worth, above the sales list.
 *
 * Maltiti ships before payment as a matter of course, so "how much are we
 * owed" is not answerable by reading the list — it is a sum over every
 * dispatched order's outstanding balance. This is that sum, with the part
 * that is past terms split out, because those are the ones to ring about.
 *
 * Collapsed to a single line by default. The headline figure stays visible on
 * that line: hiding it entirely would mean the panel answers nothing until it
 * is opened, and the whole point is to be able to see the number in passing.
 * Opening it gives the split by terms, who owes it, and the month.
 *
 * Which is why the figures load with the page rather than on first open — the
 * collapsed line has nothing to say otherwise. Same cost and same bound as
 * the attention counts beside it, which already load this way.
 */
@Component({
  selector: 'app-sales-metrics-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, TooltipModule, SkeletonModule],
  templateUrl: './sales-metrics-panel.component.html',
  styleUrl: './sales-metrics-panel.component.scss',
})
export class SalesMetricsPanelComponent {
  private readonly salesApi = inject(SalesApiService);

  /** Emits the name to filter the list by when a debtor is clicked. */
  public readonly customerSelected = output<string>();

  public readonly expanded = signal(false);
  public readonly loading = signal(false);
  public readonly failed = signal(false);
  public readonly metrics = signal<SalesMetrics>(EMPTY_SALES_METRICS);

  /** True before the first successful load, so zeroes are not read as facts. */
  private readonly loaded = signal(false);

  public readonly hasFigures = computed(() => this.loaded() && !this.failed());

  /**
   * How this month compares with the same stretch of last month.
   *
   * Says so plainly when there is nothing to compare against: a percentage
   * change from zero is not a number, and "+∞%" in a first month of trading
   * is worse than no comparison at all.
   *
   * `down` drives the colour and is deliberately false at exactly 0% — flat
   * is not a fall.
   */
  public readonly monthChange = computed<{ text: string; down: boolean }>(() => {
    const { thisMonth, lastMonthSales } = this.metrics();

    if (!lastMonthSales) {
      return { text: 'no sales this time last month', down: false };
    }

    const percent = Math.round(((thisMonth.sales - lastMonthSales) / lastMonthSales) * 100);
    const sign = percent > 0 ? '+' : '';

    return {
      text: `${sign}${percent}% vs the same point last month`,
      down: percent < 0,
    };
  });

  constructor() {
    this.load();
  }

  public toggle(): void {
    this.expanded.update((open) => !open);
  }

  /** Re-read the figures, after a retry or once something has been paid. */
  public load(): void {
    this.loading.set(true);
    this.failed.set(false);

    this.salesApi
      .getMetrics()
      .pipe(first())
      .subscribe({
        next: (metrics) => {
          this.metrics.set(metrics);
          this.loaded.set(true);
          this.loading.set(false);
        },
        /* Shown in the panel rather than as a toast. This is the one place
           the figures appear, so an empty panel with no explanation would
           read as "nothing is owed". */
        error: () => {
          this.failed.set(true);
          this.loading.set(false);
        },
      });
  }

  public onDebtorClick(debtor: Debtor): void {
    this.customerSelected.emit(debtor.customerName);
  }

  /** "40 days overdue", or nothing at all where the sale is not yet due. */
  public overdueLabel(days: number): string {
    if (!days) {
      return '';
    }

    return days === 1 ? '1 day overdue' : `${days} days overdue`;
  }

  public saleCountLabel(count: number): string {
    return count === 1 ? '1 order' : `${count} orders`;
  }
}
