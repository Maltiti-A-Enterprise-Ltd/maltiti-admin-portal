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
import { CommonModule } from '@angular/common';
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

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [
    CommonModule,
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

  /**
   * Get time ago string
   */
  public getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      return 'Just now';
    }
    if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ago`;
    }
    if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)}h ago`;
    }
    if (seconds < 604800) {
      return `${Math.floor(seconds / 86400)}d ago`;
    }
    return date.toLocaleDateString();
  }

  /**
   * Get icon for notification topic
   */
  public getNotificationIcon(notification: Notification): string {
    const topic = notification.topic;
    const iconMap: Record<string, string> = {
      // Orders
      ORDER_CREATED: 'pi-shopping-cart',
      ORDER_STATUS_UPDATED: 'pi-refresh',
      ORDER_CANCELLED: 'pi-times-circle',
      ORDER_DELIVERED: 'pi-check-circle',
      ADMIN_NEW_ORDER: 'pi-shopping-cart',
      ADMIN_ORDER_CANCELLED: 'pi-times-circle',

      // Payments
      PAYMENT_RECEIVED: 'pi-money-bill',
      PAYMENT_FAILED: 'pi-exclamation-circle',
      REFUND_PROCESSED: 'pi-replay',

      // Products
      PRODUCT_CREATED: 'pi-box',
      PRODUCT_PRICE_CHANGED: 'pi-tag',
      PRODUCT_OUT_OF_STOCK: 'pi-exclamation-triangle',
      PRODUCT_BACK_IN_STOCK: 'pi-check',
      ADMIN_LOW_STOCK_ALERT: 'pi-exclamation-triangle',

      // Users
      USER_ACCOUNT_CREATED: 'pi-user-plus',
      USER_EMAIL_VERIFIED: 'pi-verified',
      USER_PASSWORD_RESET: 'pi-key',
      USER_PROFILE_UPDATED: 'pi-user-edit',

      // Reviews
      REVIEW_SUBMITTED: 'pi-star',
      REVIEW_APPROVED: 'pi-check',
      REVIEW_REJECTED: 'pi-times',

      // System
      SYSTEM_MAINTENANCE: 'pi-wrench',
      SYSTEM_ANNOUNCEMENT: 'pi-megaphone',
      ADMIN_CONTACT_FORM_SUBMITTED: 'pi-envelope',
    };

    return iconMap[topic] || 'pi-bell';
  }

  /**
   * Get color class for notification topic
   */
  public getNotificationColor(notification: Notification): string {
    const topic = notification.topic;

    // Grouping by sentiment
    const errorTopics = [
      'PAYMENT_FAILED',
      'ORDER_CANCELLED',
      'ADMIN_ORDER_CANCELLED',
      'PRODUCT_OUT_OF_STOCK',
    ];
    const warningTopics = ['ADMIN_LOW_STOCK_ALERT', 'SYSTEM_MAINTENANCE'];
    const successTopics = [
      'ORDER_DELIVERED',
      'PAYMENT_RECEIVED',
      'PRODUCT_BACK_IN_STOCK',
      'REVIEW_APPROVED',
      'USER_EMAIL_VERIFIED',
    ];

    if (errorTopics.includes(topic)) {
      return 'sentiment-error';
    }
    if (warningTopics.includes(topic)) {
      return 'sentiment-warning';
    }
    if (successTopics.includes(topic)) {
      return 'sentiment-success';
    }
    return 'sentiment-info';
  }

  /**
   * Track by function for notifications
   */
  public trackByNotification(index: number, notification: Notification): string {
    return notification.id;
  }

  protected readonly String = String;
}
