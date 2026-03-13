/**
 * Notification Panel Component
 * Dropdown panel showing recent notifications with infinite scroll
 */

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  output,
  viewChild,
} from '@angular/core';

import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Popover, PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { NotificationService } from '@features/notifications';
import { Notification } from '@models/notification.model';
import { OverlayBadge } from 'primeng/overlaybadge';
import {
  getNotificationColor,
  getNotificationIcon,
  getTimeAgo,
  trackByNotification,
} from '@shared/utils/notification-utils';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [
    RouterModule,
    PopoverModule,
    ButtonModule,
    ScrollPanelModule,
    DividerModule,
    SkeletonModule,
    TooltipModule,
    OverlayBadge,
  ],
  templateUrl: './notification-panel.component.html',
  styleUrls: ['./notification-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationPanelComponent implements AfterViewInit {
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly panel = viewChild<Popover>('panel');
  public readonly scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  // Output events
  public readonly notificationClick = output<Notification>();

  // Public signals
  public readonly notifications = this.notificationService.notifications;
  public readonly loading = this.notificationService.loading;
  public readonly hasMore = this.notificationService.hasMore;
  public readonly unreadCount = this.notificationService.unreadCount;

  /**
   * Toggle panel visibility
   */
  public toggle(event: Event): void {
    this.panel()?.toggle(event);

    // Load notifications when panel opens (load on first toggle if empty)
    if (this.notifications().length === 0) {
      this.notificationService.loadNotifications();
    }
  }

  /**
   * Setup infinite scroll after view init
   */
  public ngAfterViewInit(): void {
    const scrollEl = this.scrollContainer();
    if (scrollEl) {
      fromEvent(scrollEl.nativeElement, 'scroll')
        .pipe(debounceTime(200), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.onScroll();
        });
    }
  }

  /**
   * Handle scroll event for infinite loading
   */
  private onScroll(): void {
    const scrollEl = this.scrollContainer();
    if (!scrollEl) {
      return;
    }
    const element = scrollEl.nativeElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    // Load more when scrolled to 80% of the content
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      this.loadMore();
    }
  }

  /**
   * Load more notifications
   */
  public loadMore(): void {
    if (!this.loading() && this.hasMore()) {
      this.notificationService.loadMore();
    }
  }

  /**
   * Handle notification click
   */
  public onNotificationClick(notification: Notification): void {
    this.notificationService.navigateToNotification(notification);
    this.notificationClick.emit(notification);
    this.panel()?.hide();
  }

  /**
   * Mark all as read
   */
  public onMarkAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  /**
   * Mark single notification as read
   */
  public onMarkAsRead(notification: Notification): void {
    this.notificationService.markAsRead(notification.id);
  }

  protected readonly String = String;
  protected readonly getTimeAgo = getTimeAgo;
  protected readonly getNotificationIcon = getNotificationIcon;
  protected readonly getNotificationColor = getNotificationColor;
  protected readonly trackByNotification = trackByNotification;
}
