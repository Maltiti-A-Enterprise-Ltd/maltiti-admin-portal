import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { OrderStatus, Sale } from '../../models/sale.model';
import * as SalesActions from '../../store/sales.actions';
import { arrivalStatus } from '../../utils/arrival-date';

/**
 * Setting, revising or removing the date a shipment is expected.
 *
 * Opened from two places, which is why it is its own component rather than
 * part of either: when an order is put in transit, and from the row menu
 * whenever the agent quotes a new date. Those are the same question asked at
 * different moments, and the second is the common one — a date is revised far
 * more often than it is first set.
 *
 * The sale is only moved to in transit when the modal was opened *for* that
 * move. Revising the date of something already on its way must not restate a
 * status, which would reset the clocks the other attention rules read.
 */
@Component({
  selector: 'app-arrival-date-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, DatePickerModule],
  templateUrl: './arrival-date-modal.component.html',
  styleUrl: './arrival-date-modal.component.scss',
})
export class ArrivalDateModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  public readonly saved = output<void>();

  public readonly visible = signal(false);

  /** Set when the modal was opened as part of dispatching the order. */
  private readonly dispatching = signal(false);
  private readonly sale = signal<Sale | null>(null);

  public readonly form = this.fb.group({
    estimatedArrivalDate: [null as Date | null],
  });

  /** Yesterday's date is almost always a typo, so the picker refuses it. */
  public readonly minDate = new Date();

  public readonly header = computed(() =>
    this.dispatching() ? 'Dispatch — when will it arrive?' : 'Estimated arrival date',
  );

  /** What is currently stored, so a revision shows what it replaces. */
  public readonly existing = computed(() => arrivalStatus(this.sale()?.estimatedArrivalDate));

  /**
   * @param dispatching True when this was opened by moving the order to in
   *   transit, in which case saving also makes that move.
   */
  public open(sale: Sale, dispatching = false): void {
    this.sale.set(sale);
    this.dispatching.set(dispatching);
    this.form.reset({
      estimatedArrivalDate: sale.estimatedArrivalDate ? new Date(sale.estimatedArrivalDate) : null,
    });
    this.visible.set(true);
  }

  public close(): void {
    this.visible.set(false);
    this.sale.set(null);
    this.dispatching.set(false);
  }

  /**
   * Saving with the field empty clears the date rather than doing nothing —
   * `null` and omitted mean different things to the API, and "no date after
   * all" has to be expressible.
   */
  public save(): void {
    const sale = this.sale();

    if (!sale) {
      return;
    }

    const picked = this.form.controls.estimatedArrivalDate.value;

    this.store.dispatch(
      SalesActions.updateSaleStatus({
        id: sale.id,
        /* Only when this opened as a dispatch. Restating the status on a
           plain revision would reset the clocks the other rules read. */
        ...(this.dispatching() ? { orderStatus: OrderStatus.IN_TRANSIT } : {}),
        estimatedArrivalDate: picked ? toIsoDay(picked) : null,
      }),
    );

    this.saved.emit();
    this.close();
  }
}

/**
 * The calendar day the admin picked, without the time the picker happened to
 * attach to it. Sent as UTC midnight so a date chosen in Accra does not land
 * on the previous day for anyone reading it elsewhere.
 */
function toIsoDay(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();
}
