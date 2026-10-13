/**
 * Dashboard Layout Component
 * Main layout wrapper with sidebar, header, and content area
 * Uses Angular signals for reactive state management
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, BottomNavComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  /* Not `required`: on a cold load of a deep link the first NavigationEnd can
     arrive before the view exists, and there is nothing to scroll yet anyway. */
  private readonly content = viewChild<ElementRef<HTMLElement>>('content');

  // Signal for sidebar collapsed state
  public readonly sidebarCollapsed = signal(true);

  constructor() {
    /*
     * Send every new page back to the top.
     *
     * The app does not scroll the window — `main.dashboard-content` does, so
     * the router's own `scrollPositionRestoration` has nothing to act on and
     * a new route simply inherits the previous page's offset. Opening a sale
     * from halfway down the sales list landed in the middle of the form with
     * the heading and the Update button scrolled out of reach above, which
     * reads as the page being broken. It bites hardest on a phone, where the
     * list is a tall stack of cards.
     *
     * Keyed on the path alone: query parameters change for filters and paging,
     * where yanking the reader back to the top would be the bug.
     */
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map((event) => event.urlAfterRedirects.split('?')[0]),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.content()?.nativeElement.scrollTo({ top: 0 }));
  }

  public onToggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }
}
