import { createReducer, on } from '@ngrx/store';
import { Customer, CustomerQueryDto } from '@models/customer.model';
import {
  clearError,
  createCustomer,
  createCustomerFailure,
  createCustomerSuccess,
  deleteCustomer,
  deleteCustomerFailure,
  deleteCustomerSuccess,
  loadCustomers,
  loadCustomersFailure,
  loadCustomersSuccess,
  setSelectedCustomer,
  updateCustomer,
  updateCustomerFailure,
  updateCustomerSuccess,
} from './customers.actions';

export interface CustomersState {
  customers: Customer[];
  selectedCustomer: Customer | null;
  loading: boolean;
  error: string | null;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  query: CustomerQueryDto;
}

export const initialState: CustomersState = {
  customers: [],
  selectedCustomer: null,
  loading: false,
  error: null,
  totalItems: 0,
  currentPage: 1,
  totalPages: 0,
  limit: 20,
  query: { page: 1, limit: 20 },
};

export const customersReducer = createReducer(
  initialState,
  on(loadCustomers, (state, { query }) => ({
    ...state,
    loading: true,
    error: null,
    query: { ...state.query, ...query },
    currentPage: query.page ?? state.currentPage,
    limit: query.limit ?? state.limit,
  })),
  on(loadCustomersSuccess, (state, { response }) => ({
    ...state,
    customers: response.items,
    totalItems: response.totalItems,
    currentPage: response.currentPage,
    totalPages: response.totalPages,
    loading: false,
  })),
  on(loadCustomersFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false,
  })),
  on(createCustomer, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(createCustomerSuccess, (state, { customer }) => ({
    ...state,
    customers: [customer, ...state.customers],
    totalItems: state.totalItems + 1,
    loading: false,
  })),
  on(createCustomerFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false,
  })),
  on(updateCustomer, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(updateCustomerSuccess, (state, { customer }) => ({
    ...state,
    customers: state.customers.map((c) => (c.id === customer.id ? customer : c)),
    selectedCustomer: null,
    loading: false,
  })),
  on(updateCustomerFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false,
  })),
  on(deleteCustomer, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(deleteCustomerSuccess, (state, { id }) => ({
    ...state,
    customers: state.customers.filter((c) => c.id !== id),
    totalItems: state.totalItems - 1,
    loading: false,
  })),
  on(deleteCustomerFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false,
  })),
  on(setSelectedCustomer, (state, { customer }) => ({
    ...state,
    selectedCustomer: customer,
  })),
  on(clearError, (state) => ({
    ...state,
    error: null,
  })),
);