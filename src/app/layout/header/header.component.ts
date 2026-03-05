/**
 * Header Component
 * Top navigation bar with menu toggle, breadcrumbs, and user menu
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  output,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { MenuItem } from 'primeng/api';
import {
  selectUserAvatarUrl,
  selectUserInitialsFromName,
  selectUserName,
} from '@auth/store/auth.selectors';
import { authLogout } from '@auth/store/auth.actions';
import { APP_ROUTES } from '@config/routes.config';
import { NotificationPanelComponent } from '@notifications/components/notification-panel/notification-panel.component';
import { NotificationService } from '@features/notifications/services/notification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ButtonModule, MenuModule, AvatarModule, NotificationPanelComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  public readonly toggleSidebar = output<void>();

  public readonly avatarUrl = this.store.selectSignal(selectUserAvatarUrl);
  public readonly fullName = this.store.selectSignal(selectUserName);
  public readonly userInitials = this.store.selectSignal(selectUserInitialsFromName);

  public readonly userMenuItems = computed<MenuItem[]>(() => [
    {
      label: this.fullName() || 'User',
      items: [
        {
          label: 'Settings',
          icon: 'pi pi-cog',
          command: (): void => this.navigateTo(APP_ROUTES.settings.fullPath),
        },
        {
          separator: true,
        },
        {
          label: 'Logout',
          icon: 'pi pi-sign-out',
          command: (): void => this.onLogout(),
        },
      ],
    },
  ]);

  public ngOnInit(): void {
    // Initialize notifications on component load
    this.notificationService.loadNotifications();
    this.notificationService.refreshUnreadCount();
  }

  public onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  public onLogout(): void {
    this.store.dispatch(authLogout());
  }

  private navigateTo(path: string): void {
    void this.router.navigate([path]);
  }
}
