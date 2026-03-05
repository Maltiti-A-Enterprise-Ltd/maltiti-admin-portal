/**
 * Notifications Feature Routes
 */

import { Routes } from '@angular/router';
import { NotificationsListComponent } from './pages/notifications-list/notifications-list.component';

export const notificationsRoutes: Routes = [
  {
    path: '',
    component: NotificationsListComponent,
    title: 'Notifications',
  },
];
