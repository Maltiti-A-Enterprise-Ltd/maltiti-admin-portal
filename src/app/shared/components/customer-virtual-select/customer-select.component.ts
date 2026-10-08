/**
 * Virtual Scroll Select Component
 * Custom select component with lazy loading and virtual scroll for large datasets
 * Uses PrimeNG Select with virtual scroll and filter
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
} from '@angular/core';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { Store } from '@ngrx/store';
import { loadCustomers } from '@features/sales/store/customers.actions';
import {
  selectCustomers,
  selectHasMore,
  selectLoading,
} from '@features/sales/store/customers.selectors';
import { customerFullLabel } from '@shared/utils/customer-name';

@Component({
  selector: 'app-customer-select',
  imports: [ReactiveFormsModule, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-select.component.html',
  styleUrls: ['./customer-select.component.scss'],
})
export class CustomerSelectComponent implements OnInit {
  private readonly store = inject(Store);

  // Inputs
  public readonly control = input.required<FormControl>();
  public readonly placeholder = input<string>('Select a customer');
  public readonly showClear = input<boolean>(true);
  public readonly disabled = input<boolean>(false);
  public readonly styleClass = input<string>('');

  // Signals from store
  public readonly customers = this.store.selectSignal(selectCustomers);
  public readonly loading = this.store.selectSignal(selectLoading);
  public readonly hasMore = this.store.selectSignal(selectHasMore);

  /**
   * p-select filters and renders by a flat string, so pre-compute one label
   * that covers both the contact name and the organization.
   */
  public readonly customerOptions = computed(() =>
    (this.customers() ?? []).map((customer) => ({
      ...customer,
      displayLabel: customerFullLabel(customer),
    })),
  );

  // Local state
  private currentPage = 1;
  private readonly pageSize = 20;
  private currentSearch = '';

  constructor() {
    // Load initial customers when component initializes
    effect(() => {
      const customersList = this.customers();
      if (!customersList || customersList.length === 0) {
        this.loadCustomers();
      }
    });
  }

  public ngOnInit(): void {
    this.loadCustomers();
  }

  public onFilter(event: { filter: string }): void {
    const searchTerm = event.filter || '';

    if (searchTerm !== this.currentSearch) {
      this.currentSearch = searchTerm;
      this.currentPage = 1;
      this.loadCustomers();
    }
  }

  private loadCustomers(): void {
    this.store.dispatch(
      loadCustomers({
        query: {
          page: this.currentPage,
          limit: this.pageSize,
          search: this.currentSearch || undefined,
        },
      }),
    );
  }
}
