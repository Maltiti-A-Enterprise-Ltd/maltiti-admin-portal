import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { CustomersApiService } from '../services/customers-api.service';
import {
  createCustomer,
  createCustomerFailure,
  createCustomerSuccess,
  deleteCustomer,
  deleteCustomerFailure,
  deleteCustomerSuccess,
  loadCustomers,
  loadCustomersFailure,
  loadCustomersSuccess,
  updateCustomer,
  updateCustomerFailure,
  updateCustomerSuccess,
} from './customers.actions';
@Injectable()
export class CustomersEffects {
  private readonly customersApi = inject(CustomersApiService);
  private readonly actions$ = inject(Actions);
  private readonly messageService = inject(MessageService);

  public loadCustomers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCustomers),
      mergeMap(({ query }) =>
        this.customersApi.getCustomers(query).pipe(
          map(({ data }) => loadCustomersSuccess({ response: data })),
          catchError((error) =>
            of(loadCustomersFailure({ error: error.message || 'Failed to load customers' })),
          ),
        ),
      ),
    ),
  );

  public createCustomer$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createCustomer),
      mergeMap(({ customerData }) =>
        this.customersApi.createCustomer(customerData).pipe(
          map(({ data: customer }) => createCustomerSuccess({ customer })),
          catchError((error) =>
            of(createCustomerFailure({ error: error.message || 'Failed to create customer' })),
          ),
        ),
      ),
    ),
  );

  public updateCustomer$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateCustomer),
      mergeMap(({ customerData }) =>
        this.customersApi.updateCustomer(customerData).pipe(
          map((customer) => updateCustomerSuccess({ customer })),
          catchError((error) =>
            of(updateCustomerFailure({ error: error.message || 'Failed to update customer' })),
          ),
        ),
      ),
    ),
  );

  public deleteCustomer$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteCustomer),
      mergeMap(({ id }) =>
        this.customersApi.deleteCustomer(id).pipe(
          map(() => deleteCustomerSuccess({ id })),
          catchError((error) =>
            of(deleteCustomerFailure({ error: error.message || 'Failed to delete customer' })),
          ),
        ),
      ),
    ),
  );

  public createCustomerSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(createCustomerSuccess),
        tap(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Customer created successfully',
          });
        }),
      ),
    { dispatch: false },
  );

  public updateCustomerSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(updateCustomerSuccess),
        tap(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Customer updated successfully',
          });
        }),
      ),
    { dispatch: false },
  );

  public deleteCustomerSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(deleteCustomerSuccess),
        tap(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Customer deleted successfully',
          });
        }),
      ),
    { dispatch: false },
  );

  public handleError$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          loadCustomersFailure,
          createCustomerFailure,
          updateCustomerFailure,
          deleteCustomerFailure,
        ),
        tap(({ error }) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error,
          });
        }),
      ),
    { dispatch: false },
  );
}
