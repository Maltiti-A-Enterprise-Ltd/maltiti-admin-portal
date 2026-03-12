/**
 * Customers Feature Routes
 * Lazy-loaded routes for the customers feature module
 */

import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth.guard';

export const CUSTOMERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/customers-list/customers-list.component').then(
        (m) => m.CustomersListComponent,
      ),
    canActivate: [authGuard],
  },
];
