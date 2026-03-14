/**
 * Sales Feature Routes
 * Lazy-loaded routes for the sales feature module
 */

import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth.guard';
import { saleResolver } from './resolvers/sale.resolver';

export const SALES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/sales-list/sales-list.component').then((m) => m.SalesListComponent),
    canActivate: [authGuard],
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/sales-form/sales-form.component').then((m) => m.SalesFormComponent),
    canActivate: [authGuard],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/sales-form/sales-form.component').then((m) => m.SalesFormComponent),
    canActivate: [authGuard],
    resolve: { sale: saleResolver },
  },
  {
    path: ':id/payments',
    loadComponent: () =>
      import('./pages/sale-detail/sale-detail.component').then((m) => m.SaleDetailComponent),
    canActivate: [authGuard],
    resolve: { sale: saleResolver },
  },
];
