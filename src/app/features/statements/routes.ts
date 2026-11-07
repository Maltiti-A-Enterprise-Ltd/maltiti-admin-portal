import { Routes } from '@angular/router';

export const STATEMENTS_ROUTES: Routes = [
  {
    path: '',
    title: 'Statement of account',
    loadComponent: () =>
      import('./pages/statement-page/statement-page.component').then(
        (m) => m.StatementPageComponent,
      ),
  },
];
