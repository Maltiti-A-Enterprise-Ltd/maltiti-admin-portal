/**
 * Notification Badge Component
 * Displays notification icon with unread count badge
 */

import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { NotificationService } from '@features/notifications';

@Component({
  selector: 'app-notification-badge',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './notification-badge.component.html',
  styleUrls: ['./notification-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBadgeComponent {
  private readonly notificationService = inject(NotificationService);

  // Output event when badge is clicked
  public readonly badgeClick = output<void>();

  // Public signals
  public readonly unreadCount = this.notificationService.unreadCount;

  /**
   * Handle badge click
   */
  public onBadgeClick(): void {
    this.badgeClick.emit();
  }
}
