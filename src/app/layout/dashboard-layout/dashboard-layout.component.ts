/**
 * Dashboard Layout Component
 * Main layout wrapper with sidebar, header, and content area
 * Uses Angular signals for reactive state management
 */

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
  // Signal for sidebar collapsed state
  public readonly sidebarCollapsed = signal(true);

  public onToggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }
}
