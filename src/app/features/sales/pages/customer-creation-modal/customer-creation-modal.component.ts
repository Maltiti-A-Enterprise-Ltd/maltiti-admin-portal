/**
 * Customer Creation Modal Component
 * Used during sale creation to quickly create a new customer
 * Cascading country → region → city selects
 */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
import { CreateCustomerDto, Customer } from '@models/customer.model';
import { createCustomer, createCustomerSuccess } from '../../store/customers.actions';
import { selectLoading } from '../../store/customers.selectors';

@Component({
  selector: 'app-customer-creation-modal',
  templateUrl: './customer-creation-modal.component.html',
  styleUrls: ['./customer-creation-modal.component.scss'],
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerCreationModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly geoService = inject(GeographyService);

  public readonly customerCreated = output<Customer>();
  public readonly loading = this.store.selectSignal(selectLoading);
  // eslint-disable-next-line @angular-eslint/prefer-signals
  public visible = signal(false);

  // Geo options
  public readonly countryOptions = this.geoService.getCountries();
  public readonly regionOptions = signal<GeoOption[]>([]);
  public readonly cityOptions = signal<GeoOption[]>([]);

  public readonly customerForm = this.fb.group({
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
    // Cascade: country → states/regions
    this.customerForm.controls.country.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((country) => {
        this.customerForm.controls.region.reset('');
        this.customerForm.controls.city.reset('');
        this.cityOptions.set([]);
        this.regionOptions.set(country ? this.geoService.getStates(country) : []);
      });

    // Cascade: region → cities
    this.customerForm.controls.region.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((region) => {
        this.customerForm.controls.city.reset('');
        const country = this.customerForm.controls.country.value ?? '';
        this.cityOptions.set(region && country ? this.geoService.getCities(country, region) : []);
      });

    // Close on success
    this.actions$
      .pipe(ofType(createCustomerSuccess), takeUntilDestroyed(this.destroyRef))
      .subscribe(({ customer }) => {
        this.customerCreated.emit(customer);
        this.close();
      });
  }

  public open(): void {
    this.customerForm.reset();
    // Default to Ghana
    this.customerForm.controls.country.setValue('Ghana', { emitEvent: false });
    this.regionOptions.set(this.geoService.getStates('Ghana'));
    this.cityOptions.set([]);
    this.visible.set(true);
  }

  public close(): void {
    this.visible.set(false);
    this.customerForm.reset();
    this.regionOptions.set([]);
    this.cityOptions.set([]);
  }

  public onSubmit(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }
    const v = this.customerForm.value;
    const customerData: CreateCustomerDto = {
      name: v.name ?? '',
      phone: v.phone || undefined,
      phoneNumber: v.phoneNumber || undefined,
      email: v.email || undefined,
      country: v.country || undefined,
      region: v.region || undefined,
      city: v.city || undefined,
      address: v.address || undefined,
      extraInfo: v.extraInfo || undefined,
    };
    this.store.dispatch(createCustomer({ customerData }));
  }
}
