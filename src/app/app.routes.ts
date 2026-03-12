import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth.guard';
import { APP_ROUTES } from '@config/routes.config';

export const routes: Routes = [
  {
    path: APP_ROUTES.root.path,
    redirectTo: APP_ROUTES.dashboard.fullPath,
    pathMatch: 'full',
  },
  {
    path: APP_ROUTES.auth.login.path,
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/dashboard-layout/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent,
      ),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: APP_ROUTES.dashboard.path,
        pathMatch: 'full',
      },
      {
        path: APP_ROUTES.dashboard.path,
        loadComponent: () =>
          import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: APP_ROUTES.products.path,
        loadChildren: () => import('./features/products/routes').then((m) => m.PRODUCTS_ROUTES),
      },
      {
        path: APP_ROUTES.batches.path,
        loadChildren: () => import('./features/batches/routes').then((m) => m.BATCHES_ROUTES),
      },
      {
        path: APP_ROUTES.users.path,
        loadChildren: () => import('./features/users/routes').then((m) => m.USERS_ROUTES),
      },
      {
        path: APP_ROUTES.sales.path,
        loadChildren: () => import('./features/sales/routes').then((m) => m.SALES_ROUTES),
      },
      {
        path: APP_ROUTES.customers.path,
        loadChildren: () => import('./features/customers/routes').then((m) => m.CUSTOMERS_ROUTES),
      },
      {
        path: APP_ROUTES.reports.path,
        loadChildren: () => import('./features/reports/routes').then((m) => m.REPORTS_ROUTES),
      },
      {
        path: APP_ROUTES.auditLogs.path,
        loadChildren: () => import('./features/audit-logs/routes').then((m) => m.AUDIT_LOGS_ROUTES),
      },
      {
        path: APP_ROUTES.settings.path,
        loadChildren: () => import('./features/settings/routes').then((m) => m.SETTINGS_ROUTES),
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('./features/notifications/routes').then((m) => m.notificationsRoutes),
      },
    ],
  },
  {
    path: '**',
    redirectTo: APP_ROUTES.dashboard.fullPath,
  },
];
