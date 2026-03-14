/**
 * Customers List Page Component
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Store } from '@ngrx/store';

// PrimeNG
import { TableModule, TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';

// Local
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { SelectComponent } from '@shared/components/select/select.component';
import { GeographyService, GeoOption } from '@shared/services/geography.service';
import { Customer, CustomerSortBy, SortOrder } from '@models/customer.model';
import {
  deleteCustomer,
  loadCustomers,
  setSelectedCustomer,
} from '@features/sales/store/customers.actions';
import {
  selectCurrentPage,
  selectCustomers,
  selectLimit,
  selectLoading,
  selectTotalItems,
} from '@features/sales/store/customers.selectors';
import { CustomerFormDialogComponent } from '../customer-form-dialog/customer-form-dialog.component';

@Component({
  selector: 'app-customers-list',
  templateUrl: './customers-list.component.html',
  styleUrl: './customers-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    ConfirmDialogModule,
    TooltipModule,
    InputTextModule,
    SkeletonModule,
    DatePickerModule,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    CustomerFormDialogComponent,
  ],
})
export class CustomersListComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly geoService = inject(GeographyService);

  // Store signals
  public readonly customers = this.store.selectSignal(selectCustomers);
  public readonly loading = this.store.selectSignal(selectLoading);
  public readonly totalItems = this.store.selectSignal(selectTotalItems);
  public readonly currentPage = this.store.selectSignal(selectCurrentPage);
  public readonly limit = this.store.selectSignal(selectLimit);

  // Dialog ref
  public readonly formDialog = viewChild.required(CustomerFormDialogComponent);

  // Selected customer for edit/delete
  public readonly selectedCustomer = signal<Customer | null>(null);

  // Filter panel toggle
  public readonly showAdvancedFilters = signal(false);

  // ── Filter controls ──────────────────────────────────────
  public readonly searchControl = new FormControl<string>('');
  public readonly countryControl = new FormControl<string | null>(null);
  public readonly regionControl = new FormControl<string>('');
  public readonly cityControl = new FormControl<string>('');
  public readonly startDateControl = new FormControl<Date | null>(null);
  public readonly endDateControl = new FormControl<Date | null>(null);
  public readonly sortByControl = new FormControl<CustomerSortBy>(CustomerSortBy.CREATED_AT);
  public readonly sortOrderControl = new FormControl<SortOrder>(SortOrder.DESC);

  // Cascading region/city signals
  public readonly regionOptions = signal<GeoOption[]>([]);
  public readonly cityOptions = signal<GeoOption[]>([]);

  // Static options
  public readonly countryOptions: GeoOption[] = [
    { label: 'All Countries', value: null as unknown as string },
    ...this.geoService.getCountries(),
  ];

  public readonly sortByOptions = [
    { label: 'Date Created', value: CustomerSortBy.CREATED_AT },
    { label: 'Name', value: CustomerSortBy.NAME },
    { label: 'Email', value: CustomerSortBy.EMAIL },
    { label: 'City', value: CustomerSortBy.CITY },
  ];

  public readonly sortOrderOptions = [
    { label: 'Newest First', value: SortOrder.DESC },
    { label: 'Oldest First', value: SortOrder.ASC },
  ];

  public readonly skeletonRows = [1, 2, 3, 4, 5, 6, 7, 8];

  public readonly activeFiltersCount = computed(() => {
    let count = 0;
    if (this.searchControl.value) {
      count++;
    }
    if (this.countryControl.value) {
      count++;
    }
    if (this.regionControl.value) {
      count++;
    }
    if (this.cityControl.value) {
      count++;
    }
    if (this.startDateControl.value) {
      count++;
    }
    if (this.endDateControl.value) {
      count++;
    }
    return count;
  });

  public ngOnInit(): void {
    this.loadCustomers();

    // Search with debounce
    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadCustomers(1));

    // Country → cascade reset region & city, then reload
    this.countryControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((country) => {
        this.regionControl.reset('', { emitEvent: false });
        this.cityControl.reset('', { emitEvent: false });
        this.cityOptions.set([]);
        this.regionOptions.set(country ? this.geoService.getStates(country) : []);
        this.loadCustomers(1);
      });

    // Region → cascade reset city, then reload
    this.regionControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((region) => {
        this.cityControl.reset('', { emitEvent: false });
        const country = this.countryControl.value ?? '';
        this.cityOptions.set(region && country ? this.geoService.getCities(country, region) : []);
        this.loadCustomers(1);
      });

    // City filter
    this.cityControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadCustomers(1));

    // Date filters
    this.startDateControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadCustomers(1));

    this.endDateControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadCustomers(1));

    // Sorting
    this.sortByControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadCustomers(1));

    this.sortOrderControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadCustomers(1));
  }

  public loadCustomers(page = 1): void {
    const startDate = this.startDateControl.value;
    const endDate = this.endDateControl.value;

    this.store.dispatch(
      loadCustomers({
        query: {
          page,
          limit: this.limit(),
          search: this.searchControl.value || undefined,
          country: this.countryControl.value || undefined,
          region: this.regionControl.value || undefined,
          city: this.cityControl.value || undefined,
          startDate: startDate ? this.toIsoDate(startDate) : undefined,
          endDate: endDate ? this.toIsoDate(endDate) : undefined,
          sortBy: this.sortByControl.value ?? CustomerSortBy.CREATED_AT,
          sortOrder: this.sortOrderControl.value ?? SortOrder.DESC,
        },
      }),
    );
  }

  public onPageChange(event: TablePageEvent): void {
    const startDate = this.startDateControl.value;
    const endDate = this.endDateControl.value;
    const page = Math.floor(event.first / event.rows) + 1;

    this.store.dispatch(
      loadCustomers({
        query: {
          page,
          limit: event.rows,
          search: this.searchControl.value || undefined,
          country: this.countryControl.value || undefined,
          region: this.regionControl.value || undefined,
          city: this.cityControl.value || undefined,
          startDate: startDate ? this.toIsoDate(startDate) : undefined,
          endDate: endDate ? this.toIsoDate(endDate) : undefined,
          sortBy: this.sortByControl.value ?? CustomerSortBy.CREATED_AT,
          sortOrder: this.sortOrderControl.value ?? SortOrder.DESC,
        },
      }),
    );
  }

  public onCreateCustomer(): void {
    this.selectedCustomer.set(null);
    this.store.dispatch(setSelectedCustomer({ customer: null }));
    setTimeout(() => this.formDialog().open(), 0);
  }

  public onEditCustomer(customer: Customer): void {
    this.selectedCustomer.set(customer);
    this.store.dispatch(setSelectedCustomer({ customer }));
    setTimeout(() => this.formDialog().open(), 0);
  }

  public onDeleteCustomer(customer: Customer): void {
    this.confirmationService.confirm({
      header: 'Delete Customer',
      message: `Are you sure you want to delete <strong>${customer.name}</strong>? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.store.dispatch(deleteCustomer({ id: customer.id })),
    });
  }

  public onDialogSaved(): void {
    this.selectedCustomer.set(null);
    this.loadCustomers();
  }

  public onDialogCancelled(): void {
    this.selectedCustomer.set(null);
  }

  public clearFilters(): void {
    this.searchControl.reset('');
    this.countryControl.reset(null);
    this.regionControl.reset('');
    this.cityControl.reset('');
    this.startDateControl.reset(null);
    this.endDateControl.reset(null);
    this.sortByControl.reset(CustomerSortBy.CREATED_AT);
    this.sortOrderControl.reset(SortOrder.DESC);
    this.regionOptions.set([]);
    this.cityOptions.set([]);
  }

  public toggleAdvancedFilters(): void {
    this.showAdvancedFilters.update((v) => !v);
  }

  public getAvatarInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('');
  }

  public getPrimaryPhone(customer: Customer): string {
    return customer.phone || customer.phoneNumber || '';
  }

  public getSecondaryPhone(customer: Customer): string {
    return customer.phone && customer.phoneNumber ? customer.phoneNumber : '';
  }

  public hasLocation(customer: Customer): boolean {
    return !!(customer.country || customer.region || customer.city);
  }

  public getLocationLabel(customer: Customer): string {
    return [customer.city, customer.region, customer.country].filter(Boolean).join(' · ');
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
