import { createAction, props } from '@ngrx/store';
import {
  CreateCustomerDto,
  Customer,
  CustomerQueryDto,
  UpdateCustomerDto,
} from '@models/customer.model';
import { IPagination } from '@models/response.model';

export const loadCustomers = createAction(
  '[Customers] Load Customers',
  props<{ query: CustomerQueryDto }>(),
);

export const loadCustomersSuccess = createAction(
  '[Customers] Load Customers Success',
  props<{ response: IPagination<Customer> }>(),
);

export const loadCustomersFailure = createAction(
  '[Customers] Load Customers Failure',
  props<{ error: string }>(),
);

export const createCustomer = createAction(
  '[Customers] Create Customer',
  props<{ customerData: CreateCustomerDto }>(),
);

export const createCustomerSuccess = createAction(
  '[Customers] Create Customer Success',
  props<{ customer: Customer }>(),
);

export const createCustomerFailure = createAction(
  '[Customers] Create Customer Failure',
  props<{ error: string }>(),
);

export const updateCustomer = createAction(
  '[Customers] Update Customer',
  props<{ customerData: UpdateCustomerDto }>(),
);

export const updateCustomerSuccess = createAction(
  '[Customers] Update Customer Success',
  props<{ customer: Customer }>(),
);

export const updateCustomerFailure = createAction(
  '[Customers] Update Customer Failure',
  props<{ error: string }>(),
);

export const deleteCustomer = createAction('[Customers] Delete Customer', props<{ id: string }>());

export const deleteCustomerSuccess = createAction(
  '[Customers] Delete Customer Success',
  props<{ id: string }>(),
);

export const deleteCustomerFailure = createAction(
  '[Customers] Delete Customer Failure',
  props<{ error: string }>(),
);

export const setSelectedCustomer = createAction(
  '[Customers] Set Selected Customer',
  props<{ customer: Customer | null }>(),
);

export const clearError = createAction('[Customers] Clear Error');
