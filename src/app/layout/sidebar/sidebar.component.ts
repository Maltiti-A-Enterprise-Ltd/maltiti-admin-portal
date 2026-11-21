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
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Tooltip } from 'primeng/tooltip';

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

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, ButtonModule, Drawer, RouterLinkActive, NgTemplateOutlet, Tooltip],
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

  /**
   * Closes the drawer after a destination is chosen.
   *
   * Routing alone leaves it covering the page it just navigated to, which
   * reads as the tap having done nothing at all. Only applies on mobile — the
   * desktop sidebar is permanent and must not collapse when it is used.
   */
  public onNavigate(): void {
    if (this.isMobile() && this.visible) {
      this.toggleSidebar.emit();
    }
  }

  /**
   * The destinations, in the groups they are shown under.
   *
   * Grouped by the job rather than listed flat: twelve links in a single
   * column read as a wall, and someone chasing a payment should find
   * Statements next to Sales and Customers rather than below Batches.
   */
  public readonly menuGroups = computed<MenuGroup[]>(() => {
    const superAdmin = this.isSuperAdmin();

    return [
      {
        label: 'Overview',
        items: [
          { label: 'Dashboard', icon: 'pi pi-home', route: APP_ROUTES.dashboard.fullPath },
          { label: 'Reports', icon: 'pi pi-chart-bar', route: '/reports' },
        ],
      },
      {
        label: 'Selling',
        items: [
          { label: 'Sales', icon: 'pi pi-shopping-bag', route: APP_ROUTES.sales.fullPath },
          { label: 'Customers', icon: 'pi pi-users', route: APP_ROUTES.customers.fullPath },
          { label: 'Statements', icon: 'pi pi-book', route: APP_ROUTES.statements.fullPath },
          { label: 'Documents', icon: 'pi pi-folder', route: APP_ROUTES.documents.fullPath },
          {
            label: 'Payment accounts',
            icon: 'pi pi-credit-card',
            route: APP_ROUTES.paymentAccounts.fullPath,
          },
        ],
      },
      {
        label: 'Stock',
        items: [
          { label: 'Products', icon: 'pi pi-box', route: '/products' },
          { label: 'Batches', icon: 'pi pi-tag', route: '/batches' },
        ],
      },
      {
        label: 'Admin',
        items: [
          ...(superAdmin
            ? [
                { label: 'Users', icon: 'pi pi-user', route: APP_ROUTES.users.fullPath },
                { label: 'Audit logs', icon: 'pi pi-history', route: APP_ROUTES.auditLogs.fullPath },
              ]
            : []),
          { label: 'Settings', icon: 'pi pi-cog', route: '/settings' },
        ],
      },
    ];
  });
}
