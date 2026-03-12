import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CustomersState } from './customers.reducer';

export const selectCustomersState = createFeatureSelector<CustomersState>('customers');
export const selectCustomers = createSelector(selectCustomersState, (state) => state.customers);
export const selectLoading = createSelector(selectCustomersState, (state) => state.loading);
export const selectError = createSelector(selectCustomersState, (state) => state.error);
export const selectTotalItems = createSelector(selectCustomersState, (state) => state.totalItems);
export const selectCurrentPage = createSelector(selectCustomersState, (state) => state.currentPage);
export const selectTotalPages = createSelector(selectCustomersState, (state) => state.totalPages);
export const selectLimit = createSelector(selectCustomersState, (state) => state.limit);
export const selectQuery = createSelector(selectCustomersState, (state) => state.query);
export const selectSelectedCustomer = createSelector(
  selectCustomersState,
  (state) => state.selectedCustomer,
);
export const selectHasMore = createSelector(
  selectCurrentPage,
  selectTotalPages,
  (currentPage, totalPages) => currentPage < totalPages,
);
