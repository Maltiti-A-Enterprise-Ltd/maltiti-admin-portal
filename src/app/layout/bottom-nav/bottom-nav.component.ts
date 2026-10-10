import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { APP_ROUTES } from '@config/routes.config';
import { ViewportService } from '@shared/services/viewport.service';

interface BottomNavItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
  /** Exact matching for roots like /sales, which would otherwise stay lit on /sales/create. */
  readonly exact: boolean;
}

/**
 * The phone shell's primary navigation.
 *
 * A bottom bar rather than a hamburger because thumbs reach the bottom of a
 * phone and not the top, and because tabs keep the app's shape visible instead
 * of hiding it behind a menu. Only the destinations used daily get a tab; the
 * rest stay one tap away behind More, which opens the existing drawer.
 *
 * Five is the ceiling — past that the targets drop below the ~44px that can be
 * hit reliably without looking.
 */
@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  private readonly viewport = inject(ViewportService);

  /** Opens the full navigation drawer. */
  public readonly openMore = output<void>();

  public readonly isMobile = this.viewport.isMobile;

  public readonly items: readonly BottomNavItem[] = [
    {
      label: 'Home',
      icon: 'pi pi-home',
      route: APP_ROUTES.dashboard.fullPath,
      exact: true,
    },
    {
      label: 'Sales',
      icon: 'pi pi-shopping-bag',
      route: APP_ROUTES.sales.fullPath,
      exact: false,
    },
    {
      label: 'Products',
      icon: 'pi pi-box',
      route: '/products',
      exact: false,
    },
    {
      label: 'Customers',
      icon: 'pi pi-users',
      route: APP_ROUTES.customers.fullPath,
      exact: false,
    },
  ];
}
