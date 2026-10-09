/**
 * Payment Accounts Feature Routes
 * Lazy-loaded routes for the payment accounts feature module
 */

import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth.guard';

export const PAYMENT_ACCOUNTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/payment-accounts-list/payment-accounts-list.component').then(
        (m) => m.PaymentAccountsListComponent,
      ),
    canActivate: [authGuard],
  },
];
