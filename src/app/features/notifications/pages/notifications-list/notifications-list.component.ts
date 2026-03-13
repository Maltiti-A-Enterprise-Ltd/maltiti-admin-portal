/**
 * Notifications List Page Component
 * Full page view of all notifications with filters and infinite scroll
 */

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { NotificationService } from '@features/notifications';
import { Notification, NotificationTopic } from '@models/notification.model';
import {
  formatTopic,
  getNotificationColor,
  getNotificationIcon,
  getTimeAgo,
  trackByNotification,
} from '@shared/utils/notification-utils';

interface FilterOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-notifications-list',
  standalone: true,
  imports: [
    FormsModule,
    CardModule,
    ButtonModule,
    SkeletonModule,
    DividerModule,
    SelectModule,
    InputTextModule,
  ],
  templateUrl: './notifications-list.component.html',
  styleUrls: ['./notifications-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsListComponent implements OnInit, AfterViewInit {
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  // Public signals
  public readonly notifications = this.notificationService.notifications;
  public readonly loading = this.notificationService.loading;
  public readonly hasMore = this.notificationService.hasMore;
  public readonly unreadCount = this.notificationService.unreadCount;

  // Filter state
  public readonly filterOptions: FilterOption[] = [
    { label: 'All Notifications', value: 'all' },
    { label: 'Unread Only', value: 'unread' },
    { label: 'Orders', value: 'orders' },
    { label: 'Payments', value: 'payments' },
    { label: 'Products', value: 'products' },
    { label: 'System', value: 'system' },
  ];

  // eslint-disable-next-line @angular-eslint/prefer-signals
  public selectedFilter = signal<string>('all');
  public readonly searchQuery = signal<string>('');

  // Filtered notifications computed
  public readonly filteredNotifications = (): Notification[] => {
    let filtered = this.notifications();

    // Apply filter
    const filter = this.selectedFilter();
    if (filter === 'unread') {
      filtered = filtered.filter((n) => !n.isRead);
    } else if (filter === 'orders') {
      filtered = filtered.filter((n) =>
        [
          NotificationTopic.ORDER_CREATED,
          NotificationTopic.ORDER_STATUS_UPDATED,
          NotificationTopic.ORDER_CANCELLED,
          NotificationTopic.ORDER_DELIVERED,
          NotificationTopic.ADMIN_NEW_ORDER,
          NotificationTopic.ADMIN_ORDER_CANCELLED,
        ].includes(n.topic),
      );
    } else if (filter === 'payments') {
      filtered = filtered.filter((n) =>
        [
          NotificationTopic.PAYMENT_RECEIVED,
          NotificationTopic.PAYMENT_FAILED,
          NotificationTopic.REFUND_PROCESSED,
        ].includes(n.topic),
      );
    } else if (filter === 'products') {
      filtered = filtered.filter((n) =>
        [
          NotificationTopic.PRODUCT_CREATED,
          NotificationTopic.PRODUCT_PRICE_CHANGED,
          NotificationTopic.PRODUCT_OUT_OF_STOCK,
          NotificationTopic.PRODUCT_BACK_IN_STOCK,
          NotificationTopic.ADMIN_LOW_STOCK_ALERT,
        ].includes(n.topic),
      );
    } else if (filter === 'system') {
      filtered = filtered.filter((n) =>
        [NotificationTopic.SYSTEM_MAINTENANCE, NotificationTopic.SYSTEM_ANNOUNCEMENT].includes(
          n.topic,
        ),
      );
    }

    // Apply search
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (n) => n.title.toLowerCase().includes(query) || n.message.toLowerCase().includes(query),
      );
    }

    return filtered;
  };

  // Utility functions
  public readonly getTimeAgo = getTimeAgo;
  public readonly getNotificationIcon = getNotificationIcon;
  public readonly getNotificationColor = getNotificationColor;
  public readonly trackByNotification = trackByNotification;
  public readonly formatTopic = formatTopic;

  public ngOnInit(): void {
    // Load notifications if not already loaded
    if (this.notifications().length === 0) {
      this.notificationService.loadNotifications();
    }
  }

  public ngAfterViewInit(): void {
    if (this.scrollContainer()) {
      fromEvent(globalThis, 'scroll')
        .pipe(debounceTime(200), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.onScroll();
        });
    }
  }

  private onScroll(): void {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;

    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      this.loadMore();
    }
  }

  public loadMore(): void {
    if (!this.loading() && this.hasMore()) {
      this.notificationService.loadMore();
    }
  }

  public onNotificationClick(notification: Notification): void {
    this.notificationService.navigateToNotification(notification);
  }

  public onMarkAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  public onFilterChange(filter: FilterOption): void {
    this.selectedFilter.set(filter.value);
  }

  public onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }
}
