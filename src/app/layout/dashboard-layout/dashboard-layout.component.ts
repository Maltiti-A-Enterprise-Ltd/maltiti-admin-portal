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
import { MOBILE_BREAKPOINT_PX } from '@shared/services/viewport.service';

/** Whether the desktop rail was last left open, so it stays the way it was set. */
const SIDEBAR_EXPANDED_KEY = 'sidebar_expanded';

/** Wide enough that the labelled rail costs the page nothing it needs. */
const EXPANDED_BY_DEFAULT_PX = 1200;

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

  /**
   * On a phone: whether the drawer is closed. On a desktop: whether the rail
   * shows icons only.
   *
   * The desktop rail used to start as bare icons every time, so finding
   * Statements meant hovering down a column of pictures. It now opens with
   * its labels where there is room, and keeps whichever way it was last set.
   */
  public readonly sidebarCollapsed = signal(this.initiallyCollapsed());

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

    if (!this.isPhone()) {
      try {
        localStorage.setItem(SIDEBAR_EXPANDED_KEY, this.sidebarCollapsed() ? '0' : '1');
      } catch {
        /* Private mode or storage blocked: the choice just is not kept. */
      }
    }
  }

  private isPhone(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT_PX;
  }

  private initiallyCollapsed(): boolean {
    if (typeof window === 'undefined' || this.isPhone()) {
      return true;
    }

    try {
      const saved = localStorage.getItem(SIDEBAR_EXPANDED_KEY);

      if (saved !== null) {
        return saved !== '1';
      }
    } catch {
      /* Fall through to the default for the width. */
    }

    return window.innerWidth < EXPANDED_BY_DEFAULT_PX;
  }
}
