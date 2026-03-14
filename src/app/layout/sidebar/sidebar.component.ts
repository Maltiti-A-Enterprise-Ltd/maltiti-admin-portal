/**
 * Sidebar Component
 * Navigation sidebar with menu items and logo
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { APP_ROUTES } from '@config/routes.config';
import { Store } from '@ngrx/store';
import { selectUser } from '@auth/store/auth.selectors';
import { Role } from '@models/user.model';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, ButtonModule, Drawer, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly store = inject(Store);
  public visible = false;
  public readonly isCollapsed = input<boolean>(true);
  public readonly toggleSidebar = output<void>();

  public readonly isMobile = signal(false);
  public readonly user = this.store.selectSignal(selectUser);
  public readonly isSuperAdmin = computed(() => this.user()?.userType === Role.SuperAdmin);

  constructor() {
    effect(() => {
      this.visible = !this.isCollapsed();
    });
    effect(() => {
      const checkMobile = (): void => this.isMobile.set(window.innerWidth <= 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return (): void => window.removeEventListener('resize', checkMobile);
    });
  }

  public readonly menuItems = computed<MenuItem[]>(() => {
    const baseItems: MenuItem[] = [
      {
        label: 'Dashboard',
        icon: 'pi pi-home',
        route: APP_ROUTES.dashboard.fullPath,
      },
      {
        label: 'Products',
        icon: 'pi pi-box',
        route: '/products',
      },
      {
        label: 'Batches',
        icon: 'pi pi-tag',
        route: '/batches',
      },
      {
        label: 'Sales',
        icon: 'pi pi-shopping-bag',
        route: APP_ROUTES.sales.fullPath,
      },
      {
        label: 'Customers',
        icon: 'pi pi-users',
        route: APP_ROUTES.customers.fullPath,
      },
      // {
      //   label: 'Orders',
      //   icon: 'pi pi-shopping-cart',
      //   route: '/orders',
      // },
      // {
      //   label: 'Cooperatives',
      //   icon: 'pi pi-users',
      //   route: '/cooperatives',
      // },
      {
        label: 'Reports',
        icon: 'pi pi-chart-bar',
        route: '/reports',
      },
      {
        label: 'Settings',
        icon: 'pi pi-cog',
        route: '/settings',
      },
    ];

    if (this.isSuperAdmin()) {
      baseItems.splice(5, 0, {
        label: 'Users',
        icon: 'pi pi-user',
        route: APP_ROUTES.users.fullPath,
      });
      baseItems.splice(5, 0, {
        label: 'Audit Logs',
        icon: 'pi pi-history',
        route: APP_ROUTES.auditLogs.fullPath,
      });
    }

    return baseItems;
  });
}
