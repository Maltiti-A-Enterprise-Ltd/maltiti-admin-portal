/**
 * Customer Form Dialog Component
 * Reusable dialog for creating and editing customers
 * Cascading country → region → city selects via GeographyService
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';

// Local
import { ButtonComponent } from '@shared/components/button/button.component';
import { InputComponent } from '@shared/components/input/input.component';
import { TextareaComponent } from '@shared/components/textarea/textarea.component';
import { SelectComponent } from '@shared/components/select/select.component';
import { GeographyService, GeoOption } from '@shared/services/geography.service';
import { CreateCustomerDto, Customer, UpdateCustomerDto } from '@models/customer.model';
import {
  createCustomer,
  createCustomerSuccess,
  updateCustomer,
  updateCustomerSuccess,
} from '@features/sales/store/customers.actions';
import { selectLoading } from '@features/sales/store/customers.selectors';

@Component({
  selector: 'app-customer-form-dialog',
  templateUrl: './customer-form-dialog.component.html',
  styleUrl: './customer-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    DividerModule,
    ButtonComponent,
    InputComponent,
    TextareaComponent,
    SelectComponent,
  ],
})
export class CustomerFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly geoService = inject(GeographyService);

  public readonly customer = input<Customer | null>(null);
  public readonly saved = output<Customer>();
  public readonly cancelled = output<void>();

  public readonly loading = this.store.selectSignal(selectLoading);
  // eslint-disable-next-line @angular-eslint/prefer-signals
  public visible = signal(false);

  public readonly isEditMode = computed(() => this.customer() !== null);
  public readonly dialogHeader = computed(() =>
    this.isEditMode() ? 'Edit Customer' : 'New Customer',
  );

  // Geo options (reactive)
  public readonly countryOptions = signal<GeoOption[]>([]);
  public readonly regionOptions = signal<GeoOption[]>([]);
  public readonly cityOptions = signal<GeoOption[]>([]);

  public readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
    phone: [''],
    phoneNumber: [''],
    email: ['', [Validators.email]],
    country: [''],
    region: [''],
    city: [''],
    address: [''],
    extraInfo: [''],
  });

  public ngOnInit(): void {
    // Load countries once
    this.countryOptions.set(this.geoService.getCountries());

    // Cascade: country → states/regions
    this.form.controls.country.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((country) => {
        this.form.controls.region.reset('');
        this.form.controls.city.reset('');
        this.cityOptions.set([]);
        if (country) {
          this.regionOptions.set(this.geoService.getStates(country));
        } else {
          this.regionOptions.set([]);
        }
      });

    // Cascade: region → cities
    this.form.controls.region.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((region) => {
        this.form.controls.city.reset('');
        const country = this.form.controls.country.value ?? '';
        if (region && country) {
          this.cityOptions.set(this.geoService.getCities(country, region));
        } else {
          this.cityOptions.set([]);
        }
      });

    // Listen for successful create/update
    this.actions$
      .pipe(
        ofType(createCustomerSuccess, updateCustomerSuccess),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ customer }) => {
        this.saved.emit(customer);
        this.close();
      });
  }

  public open(): void {
    const c = this.customer();
    if (c) {
      // Pre-load geo cascades before patching
      if (c.country) {
        this.regionOptions.set(this.geoService.getStates(c.country));
      }
      if (c.country && c.region) {
        this.cityOptions.set(this.geoService.getCities(c.country, c.region));
      }
      this.form.patchValue({
        name: c.name,
        phone: c.phone ?? '',
        phoneNumber: c.phoneNumber ?? '',
        email: c.email ?? '',
        country: c.country ?? '',
        region: c.region ?? '',
        city: c.city ?? '',
        address: c.address ?? '',
        extraInfo: c.extraInfo ?? '',
      });
    } else {
      this.form.reset();
      // Default to Ghana
      this.form.controls.country.setValue('Ghana', { emitEvent: false });
      this.regionOptions.set(this.geoService.getStates('Ghana'));
      this.cityOptions.set([]);
    }
    this.visible.set(true);
  }

  public close(): void {
    this.visible.set(false);
    this.form.reset();
    this.regionOptions.set([]);
    this.cityOptions.set([]);
    this.cancelled.emit();
  }

  public onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const c = this.customer();

    const payload = {
      id: c?.id ?? '',
      name: val.name ?? '',
      phone: val.phone || undefined,
      phoneNumber: val.phoneNumber || undefined,
      email: val.email || undefined,
      country: val.country || undefined,
      region: val.region || undefined,
      city: val.city || undefined,
      address: val.address || undefined,
      extraInfo: val.extraInfo || undefined,
    };

    if (c) {
      const updateDto: UpdateCustomerDto = payload;
      this.store.dispatch(updateCustomer({ customerData: updateDto }));
    } else {
      const createDto: CreateCustomerDto = payload;
      this.store.dispatch(createCustomer({ customerData: createDto }));
    }
  }
}
