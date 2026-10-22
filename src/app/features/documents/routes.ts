/**
 * Documents Feature Routes
 * Lazy-loaded routes for the company document register
 */

import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth.guard';

export const DOCUMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/documents-list/documents-list.component').then(
        (m) => m.DocumentsListComponent,
      ),
    canActivate: [authGuard],
  },
];
